import type { AxiosInstance } from "axios";
import { AxiosError } from "axios";

const OFFLINE_PET_QUEUE_KEY = "offline_pet_operations_v1";
const OFFLINE_PET_QUEUE_EVENT = "offline-pet-queue-updated";

type OfflinePetOperationType = "create" | "update";

export interface OfflinePetOperation {
  id: string;
  type: OfflinePetOperationType;
  petId?: string;
  payload: Record<string, unknown>;
  shelterId?: string;
  createdAt: number;
}

const isDataImageUrl = (value: string) =>
  /^data:image\/[a-zA-Z0-9+.-]+;base64,/i.test(value);

const dataUrlToFile = async (dataUrl: string, filename: string) => {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  const extension = blob.type.split("/")[1] || "jpg";
  return new File([blob], `${filename}.${extension}`, { type: blob.type });
};

const uploadDataImageAndGetUrl = async (
  api: AxiosInstance,
  dataUrl: string,
  index: number,
) => {
  const file = await dataUrlToFile(dataUrl, `offline-photo-${Date.now()}-${index}`);
  const formData = new FormData();
  formData.append("image", file);
  const response = await api.post("/pets/upload-image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data?.data?.url as string;
};

const normalizePhotoArrayForSync = async (
  api: AxiosInstance,
  photos: unknown,
) => {
  if (!Array.isArray(photos)) return photos;

  const normalized: unknown[] = [];
  for (let i = 0; i < photos.length; i += 1) {
    const item = photos[i];
    if (typeof item === "string" && isDataImageUrl(item)) {
      const uploadedUrl = await uploadDataImageAndGetUrl(api, item, i);
      normalized.push(uploadedUrl);
    } else {
      normalized.push(item);
    }
  }
  return normalized;
};

const readQueue = (): OfflinePetOperation[] => {
  try {
    const raw = localStorage.getItem(OFFLINE_PET_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeQueue = (queue: OfflinePetOperation[]) => {
  localStorage.setItem(OFFLINE_PET_QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new Event(OFFLINE_PET_QUEUE_EVENT));
};

export const getOfflinePetQueueCount = () => readQueue().length;

export const onOfflinePetQueueUpdated = (listener: () => void) => {
  window.addEventListener(OFFLINE_PET_QUEUE_EVENT, listener);
  return () => window.removeEventListener(OFFLINE_PET_QUEUE_EVENT, listener);
};

export const queueOfflinePetOperation = (
  operation: Omit<OfflinePetOperation, "id" | "createdAt">,
) => {
  const queue = readQueue();
  queue.push({
    ...operation,
    id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: Date.now(),
  });
  writeQueue(queue);
};

export const syncOfflinePetQueue = async (api: AxiosInstance) => {
  if (!navigator.onLine) {
    return { synced: 0, failed: getOfflinePetQueueCount() };
  }

  const queue = readQueue();
  if (!queue.length) {
    return { synced: 0, failed: 0 };
  }

  const failed: OfflinePetOperation[] = [];
  let synced = 0;

  for (const op of queue) {
    try {
      if (op.type === "create") {
        const createPayload = { ...op.payload } as Record<string, unknown>;
        createPayload.photos = await normalizePhotoArrayForSync(
          api,
          createPayload.photos,
        );
        await api.post("/pets", {
          ...createPayload,
          shelterId: op.shelterId,
        });
      } else if (op.type === "update" && op.petId) {
        const payload = op.payload as {
          petDataWithoutStatus?: Record<string, unknown>;
          statusChanged?: boolean;
          status?: string;
        };

        const petDataWithoutStatus = {
          ...(payload.petDataWithoutStatus || {}),
        };
        petDataWithoutStatus.photos = await normalizePhotoArrayForSync(
          api,
          petDataWithoutStatus.photos,
        );

        await api.patch(`/pets/${op.petId}`, petDataWithoutStatus);

        if (payload.statusChanged && payload.status) {
          await api.patch(`/pets/${op.petId}/status`, { status: payload.status });
        }
      } else {
        failed.push(op);
        continue;
      }

      synced += 1;
    } catch (error) {
      const axiosError = error as AxiosError;
      if (!axiosError.response || axiosError.code === "ERR_NETWORK") {
        failed.push(op);
        break;
      }
      failed.push(op);
    }
  }

  writeQueue(failed);
  return { synced, failed: failed.length };
};
