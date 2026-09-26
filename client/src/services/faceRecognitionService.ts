import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise: Promise<boolean> | null = null;

/**
 * Loads the face detection, 68-point landmark, and 128D face recognition neural nets from /models
 */
export async function loadFaceRecognitionModels(): Promise<boolean> {
  if (modelsLoaded) return true;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
      ]);
      modelsLoaded = true;
      console.log('✅ Real Face Recognition Models Loaded (TinyFaceDetector + Landmarks + FaceNet 128D)');
      return true;
    } catch (err) {
      console.warn('Failed to load face-api models from /models:', err);
      modelsLoaded = false;
      return false;
    }
  })();

  return modelLoadingPromise;
}

export interface FaceDetectionResult {
  detected: boolean;
  descriptor?: number[];
  box?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  score?: number;
}

/**
 * Runs the deep-learning neural network on an image, video, or canvas element.
 * Extracts the real 128-dimensional Float32 biometric embedding from facial landmarks.
 */
export async function extractRealFaceDescriptor(
  input: HTMLImageElement | HTMLVideoElement | HTMLCanvasElement
): Promise<FaceDetectionResult> {
  const ready = await loadFaceRecognitionModels();
  if (!ready) {
    return { detected: false };
  }

  try {
    const options = new faceapi.TinyFaceDetectorOptions({
      inputSize: 320,
      scoreThreshold: 0.4
    });

    const detection = await faceapi
      .detectSingleFace(input, options)
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    if (!detection) {
      return { detected: false };
    }

    const { box } = detection.detection;
    const descriptor = Array.from(detection.descriptor);

    return {
      detected: true,
      descriptor,
      box: {
        x: Math.round(box.x),
        y: Math.round(box.y),
        width: Math.round(box.width),
        height: Math.round(box.height)
      },
      score: Math.round(detection.detection.score * 100)
    };
  } catch (err) {
    console.warn('Real face extraction error:', err);
    return { detected: false };
  }
}

/**
 * Computes standard Euclidean distance (L2 norm) between two 128D vectors.
 * Returns value typically between 0.0 (identical) and 1.2+ (completely different person).
 */
export function computeBiometricDistance(vec1: number[], vec2: number[]): number {
  if (!vec1 || !vec2 || vec1.length !== vec2.length) return 1.0;
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    const diff = vec1[i] - vec2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}
