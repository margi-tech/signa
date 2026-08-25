import { SEQ_FRAMES } from '../data/lsr-alphabet';
import { VECTOR_SIZE } from './normalize';

export const isDatasetVector = (value) => (
  Array.isArray(value)
  && value.length === VECTOR_SIZE
  && value.every(Number.isFinite)
);

export const isDatasetSequence = (value) => (
  Array.isArray(value)
  && value.length === SEQ_FRAMES
  && value.every(isDatasetVector)
);
