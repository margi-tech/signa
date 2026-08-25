export const MAX_DATASET_IMPORT_BYTES = 50 * 1024 * 1024;
export const MAX_TRAIN_IMPORT_BYTES = 100 * 1024 * 1024;

export async function readJsonObject(file, maxBytes) {
  if (!file) throw new Error('Alege un fișier JSON.');
  if (file.size > maxBytes) {
    const maxMb = Math.round(maxBytes / 1024 / 1024);
    throw new Error(`Fișierul este prea mare. Limita este ${maxMb} MB.`);
  }

  const parsed = JSON.parse(await file.text());
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Fișierul JSON trebuie să conțină un obiect cu etichete.');
  }
  return parsed;
}
