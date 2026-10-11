import io
import time
import base64
import logging
import tempfile
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any

from PIL import Image
import numpy as np

from app.core.settings import settings
from app.core.errors import ModelNotReadyException
from app.services.severity import calculate_box_area_ratio, compute_severity
from app.models.schemas import DetectionItem, DetectionResponse

logger = logging.getLogger("pothole_api")


class ModelManager:
    def __init__(self):
        self._model = None
        self._is_loaded: bool = False
        self._error: Optional[str] = None
        self._class_names: Dict[int, str] = {}
        self._model_path: Path = settings.resolved_model_path

    @property
    def is_loaded(self) -> bool:
        return self._is_loaded

    @property
    def error(self) -> Optional[str]:
        return self._error

    @property
    def class_names(self) -> Dict[int, str]:
        return self._class_names

    @property
    def model_path(self) -> Path:
        return self._model_path

    def load_model(self) -> bool:
        """
        Loads the YOLO model once at startup.
        If file is missing or loading fails, reports the error and sets is_loaded=False.
        """
        self._model_path = settings.resolved_model_path
        if not self._model_path.exists():
            self._is_loaded = False
            self._error = f"Model file not found at path: {self._model_path}"
            logger.error(self._error)
            return False

        try:
            from ultralytics import YOLO

            logger.info(f"Loading YOLO model from {self._model_path}...")
            self._model = YOLO(str(self._model_path))

            # Read class names directly from loaded model - never hardcode
            if hasattr(self._model, "names") and isinstance(self._model.names, dict):
                self._class_names = {int(k): str(v) for k, v in self._model.names.items()}
            elif hasattr(self._model, "names") and isinstance(self._model.names, list):
                self._class_names = {idx: str(name) for idx, name in enumerate(self._model.names)}
            else:
                self._class_names = {0: "pothole"}

            self._is_loaded = True
            self._error = None
            logger.info(f"Model loaded successfully. Class names: {self._class_names}")
            return True
        except Exception as e:
            self._is_loaded = False
            self._error = f"Failed to load YOLO model: {str(e)}"
            logger.exception(self._error)
            return False

    def predict_image(
        self,
        image_bytes: bytes,
        confidence_threshold: Optional[float] = None,
    ) -> DetectionResponse:
        """
        Runs YOLO inference on an image.
        Returns detection items with bounding boxes, confidences, classes, severity,
        and an annotated preview image encoded as a base64 data URI.
        """
        if not self._is_loaded or self._model is None:
            raise ModelNotReadyException(self._error or "Model is not loaded.")

        conf = confidence_threshold if confidence_threshold is not None else settings.CONFIDENCE_THRESHOLD

        start_time = time.perf_counter()

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Failed to decode image data: {str(e)}")

        img_width, img_height = image.size

        # Run inference
        results = self._model.predict(
            source=image,
            conf=conf,
            iou=settings.IOU_THRESHOLD,
            verbose=False,
        )

        inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

        detections: List[DetectionItem] = []
        severity_counts = {"low": 0, "medium": 0, "high": 0}

        annotated_base64: Optional[str] = None

        if results and len(results) > 0:
            result = results[0]

            # Generate annotated image
            plotted_bgr = result.plot()  # numpy array BGR
            # Convert BGR to RGB
            plotted_rgb = plotted_bgr[:, :, ::-1]
            annotated_pil = Image.fromarray(plotted_rgb)

            buffer = io.BytesIO()
            annotated_pil.save(buffer, format="JPEG", quality=85)
            b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
            annotated_base64 = f"data:image/jpeg;base64,{b64_str}"

            if result.boxes is not None and len(result.boxes) > 0:
                boxes = result.boxes.xyxy.cpu().numpy()
                confs = result.boxes.conf.cpu().numpy()
                classes = result.boxes.cls.cpu().numpy()

                for box, score, cls_id in zip(boxes, confs, classes):
                    cls_int = int(cls_id)
                    class_name = self._class_names.get(cls_int, f"class_{cls_int}")

                    box_coords = [round(float(c), 2) for c in box]
                    area_ratio = calculate_box_area_ratio(box_coords, img_width, img_height)
                    severity = compute_severity(area_ratio, float(score))

                    severity_counts[severity] = severity_counts.get(severity, 0) + 1

                    detections.append(
                        DetectionItem(
                            box=box_coords,
                            confidence=round(float(score), 4),
                            class_id=cls_int,
                            class_name=class_name,
                            box_area_ratio=round(area_ratio, 4),
                            severity=severity,
                        )
                    )

        return DetectionResponse(
            total_detections=len(detections),
            detections=detections,
            severity_counts=severity_counts,
            annotated_image_base64=annotated_base64,
            inference_time_ms=inference_time_ms,
            media_type="image",
        )

    def predict_frame(
        self,
        image_bytes: bytes,
        confidence_threshold: Optional[float] = None,
    ) -> Tuple[List[DetectionItem], Dict[str, int], Optional[str], float]:
        """
        Ultra-fast inference on a single live camera frame without plot encoding overhead.
        Returns: (detections, severity_counts, highest_severity, inference_time_ms)
        """
        if not self._is_loaded or self._model is None:
            raise ModelNotReadyException(self._error or "Model is not loaded.")

        conf = confidence_threshold if confidence_threshold is not None else settings.CONFIDENCE_THRESHOLD
        start_time = time.perf_counter()

        try:
            image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        except Exception as e:
            raise ValueError(f"Failed to decode camera frame: {str(e)}")

        img_width, img_height = image.size

        results = self._model.predict(
            source=image,
            conf=conf,
            iou=settings.IOU_THRESHOLD,
            imgsz=640,
            verbose=False,
        )

        inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)
        detections: List[DetectionItem] = []
        severity_counts = {"low": 0, "medium": 0, "high": 0}
        highest_severity = None
        severity_rank = {"low": 1, "medium": 2, "high": 3}
        current_max_rank = 0

        if results and len(results) > 0:
            result = results[0]
            if result.boxes is not None and len(result.boxes) > 0:
                boxes = result.boxes.xyxy.cpu().numpy()
                confs = result.boxes.conf.cpu().numpy()
                classes = result.boxes.cls.cpu().numpy()

                for box, score, cls_id in zip(boxes, confs, classes):
                    cls_int = int(cls_id)
                    class_name = self._class_names.get(cls_int, f"class_{cls_int}")
                    box_coords = [round(float(c), 2) for c in box]
                    area_ratio = calculate_box_area_ratio(box_coords, img_width, img_height)
                    severity = compute_severity(area_ratio, float(score))

                    severity_counts[severity] = severity_counts.get(severity, 0) + 1
                    if severity_rank.get(severity, 0) > current_max_rank:
                        current_max_rank = severity_rank.get(severity, 0)
                        highest_severity = severity

                    detections.append(
                        DetectionItem(
                            box=box_coords,
                            confidence=round(float(score), 4),
                            class_id=cls_int,
                            class_name=class_name,
                            box_area_ratio=round(area_ratio, 4),
                            severity=severity,
                        )
                    )

        return detections, severity_counts, highest_severity, inference_time_ms

    def predict_video(
        self,
        video_bytes: bytes,
        filename: str,
        confidence_threshold: Optional[float] = None,
    ) -> DetectionResponse:
        """
        Runs YOLO inference on short video files by sampling key frames.
        """
        if not self._is_loaded or self._model is None:
            raise ModelNotReadyException(self._error or "Model is not loaded.")

        import cv2

        conf = confidence_threshold if confidence_threshold is not None else settings.CONFIDENCE_THRESHOLD
        start_time = time.perf_counter()

        suffix = Path(filename).suffix or ".mp4"
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp_file:
            tmp_file.write(video_bytes)
            tmp_path = tmp_file.name

        try:
            cap = cv2.VideoCapture(tmp_path)
            if not cap.isOpened():
                raise ValueError("Could not open video stream from uploaded file.")

            fps = cap.get(cv2.CAP_PROP_FPS) or 30.0
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

            # Sample up to 30 frames spaced evenly
            sample_interval = max(1, int(fps / 2))  # ~2 frames per second
            max_sampled_frames = 30

            frame_idx = 0
            sampled_count = 0

            all_detections: List[DetectionItem] = []
            severity_counts = {"low": 0, "medium": 0, "high": 0}
            best_annotated_frame = None
            max_detection_conf = -1.0

            while cap.isOpened() and sampled_count < max_sampled_frames and frame_idx < total_frames:
                cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
                ret, frame = cap.read()
                if not ret:
                    break

                sampled_count += 1
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_frame = Image.fromarray(frame_rgb)

                results = self._model.predict(
                    source=pil_frame,
                    conf=conf,
                    iou=settings.IOU_THRESHOLD,
                    verbose=False,
                )

                if results and len(results) > 0:
                    res = results[0]
                    if res.boxes is not None and len(res.boxes) > 0:
                        boxes = res.boxes.xyxy.cpu().numpy()
                        confs = res.boxes.conf.cpu().numpy()
                        classes = res.boxes.cls.cpu().numpy()

                        frame_max_conf = float(np.max(confs)) if len(confs) > 0 else 0.0
                        if frame_max_conf > max_detection_conf:
                            max_detection_conf = frame_max_conf
                            best_annotated_frame = res.plot()[:, :, ::-1]

                        for box, score, cls_id in zip(boxes, confs, classes):
                            cls_int = int(cls_id)
                            class_name = self._class_names.get(cls_int, f"class_{cls_int}")
                            box_coords = [round(float(c), 2) for c in box]
                            area_ratio = calculate_box_area_ratio(box_coords, width, height)
                            sev = compute_severity(area_ratio, float(score))

                            severity_counts[sev] = severity_counts.get(sev, 0) + 1
                            all_detections.append(
                                DetectionItem(
                                    box=box_coords,
                                    confidence=round(float(score), 4),
                                    class_id=cls_int,
                                    class_name=class_name,
                                    box_area_ratio=round(area_ratio, 4),
                                    severity=sev,
                                )
                            )

                frame_idx += sample_interval

            cap.release()

            # Encode preview
            annotated_base64: Optional[str] = None
            if best_annotated_frame is not None:
                buffer = io.BytesIO()
                Image.fromarray(best_annotated_frame).save(buffer, format="JPEG", quality=85)
                b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")
                annotated_base64 = f"data:image/jpeg;base64,{b64}"

            inference_time_ms = round((time.perf_counter() - start_time) * 1000, 2)

            return DetectionResponse(
                total_detections=len(all_detections),
                detections=all_detections,
                severity_counts=severity_counts,
                annotated_image_base64=annotated_base64,
                inference_time_ms=inference_time_ms,
                media_type="video",
            )
        finally:
            Path(tmp_path).unlink(missing_ok=True)


model_manager = ModelManager()
