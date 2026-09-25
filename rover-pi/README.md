# Waveshare UGV-Beast Raspberry Pi Client

This folder contains the lightweight client script to run on the **Waveshare UGV-Beast** (Raspberry Pi 4B/5).

---

## 1. Prerequisites on Raspberry Pi
Open terminal on the Raspberry Pi (or SSH into it):
```bash
pip install "python-socketio[client]" requests
```

---

## 2. Running the Client
Connect the Raspberry Pi to your mobile hotspot (the same hotspot your laptop is connected to).
Find your laptop's IP address (e.g., `192.168.43.100`), then run:

```bash
python3 rover_client.py --server http://192.168.43.100:4000
```

---

## 3. What It Does Automatically
- Registers as **Rover-01** with the HSL Care backend.
- Receives autonomous navigation commands (`NAVIGATE` to Room 101/102/103, `RETURN_TO_DOCK`, `ESTOP`).
- Streams real-time telemetry, coordinates, and battery level directly into the Caregiver Station and 2D Mission Monitor!
