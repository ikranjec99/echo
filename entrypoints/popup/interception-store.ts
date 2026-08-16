import { createInterceptionStorage } from '../../lib/interception-storage';
import { createInterceptionStore } from '../../store/interception-store';

export const interceptionStore = createInterceptionStore(
  createInterceptionStorage(),
);
