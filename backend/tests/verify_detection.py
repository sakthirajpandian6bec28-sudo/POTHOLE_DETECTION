import os
import glob
import base64
import requests

API = "http://localhost:8000"

print("=== 1. Checking Backend Health & Model Load Status ===")
h_res = requests.get(f"{API}/api/health")
print("Status Code:", h_res.status_code)
print("Health Response:", h_res.json())

print("\n=== 2. Testing YOLO Detection with Road Photos from test-images/ ===")
test_imgs = glob.glob("test-images/*.jpg")
print(f"Found {len(test_imgs)} test photos in test-images/")

if test_imgs:
    sample_img = test_imgs[0]
    print(f"Testing with photo: {sample_img}")
    with open(sample_img, "rb") as f:
        img_bytes = f.read()

    files = {"file": (os.path.basename(sample_img), img_bytes, "image/jpeg")}
    det_res = requests.post(f"{API}/api/detect", files=files)
    print("POST /api/detect Status Code:", det_res.status_code)
    det_data = det_res.json()
    print("Total Detections Found:", det_data.get("total_detections"))
    print("Severity Breakdown:", det_data.get("severity_counts"))
    print("Inference Duration:", det_data.get("inference_time_ms"), "ms")
    for idx, d in enumerate(det_data.get("detections", [])):
        print(f"  Detection #{idx + 1}: Box={d['box']}, Conf={d['confidence']:.2%}, Severity={d['severity']}, Class='{d['class_name']}'")

    print("\n=== 3. Testing Real-time Frame Detection with Vehicle GPS Location ===")
    b64_data = base64.b64encode(img_bytes).decode("utf-8")
    frame_payload = {
        "image_base64": f"data:image/jpeg;base64,{b64_data}",
        "confidence_threshold": 0.25,
        "latitude": 12.9716,
        "longitude": 77.5946,
        "auto_log": True,
    }
    frame_res = requests.post(f"{API}/api/detect/frame", json=frame_payload)
    print("POST /api/detect/frame Status Code:", frame_res.status_code)
    frame_data = frame_res.json()
    print("Live Frame Detections:", frame_data.get("total_detections"))
    print("Highest Severity:", frame_data.get("highest_severity"))
    print("Logged Pothole IDs to Database:", frame_data.get("logged_pothole_ids"))

print("\n=== 4. Checking Saved Potholes in Database (/api/potholes) ===")
p_res = requests.get(f"{API}/api/potholes?page=1&page_size=10")
print("GET /api/potholes Status Code:", p_res.status_code)
p_data = p_res.json()
print("Total Potholes Stored in Database:", p_data.get("total"))
for p in p_data.get("items", [])[:5]:
    print(f"  Record #{p['id']}: Severity={p['severity']}, Conf={p['confidence']:.2%}, GPS=({p['latitude']}, {p['longitude']}), Time={p['timestamp']}")
