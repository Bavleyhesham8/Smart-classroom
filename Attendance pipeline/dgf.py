
from ultralytics import YOLO
import torch

print('Loading YOLO26n (will auto-download ~5MB)...')
model = YOLO('yolo26n.pt')
model.to('cuda')

device = next(model.model.parameters()).device
print(f'YOLO26n loaded on: {device}')

# Quick test inference
import numpy as np
dummy = np.zeros((640, 640, 3), dtype='uint8')
results = model(dummy, verbose=False)
print(f'Test inference: OK — {len(results)} result(s)')
print()
print('✅  YOLO26 is working on your GPU')
