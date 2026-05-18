import { AppError } from '../utils/errors.js';

// TODO: Replace this pass-through with a store-scoped merchant role table.
// Keeping it centralized avoids scattering implicit merchant authorization rules.
export function assertMerchantStoreAccess(req, storeId) {
  const operatorId = req.user?.id ?? req.auth?.userId;

  if (!operatorId) {
    throw new AppError({
      code: 'UNAUTHORIZED',
      message: 'Merchant operator is not authenticated',
      status: 401,
    });
  }

  if (!storeId) {
    throw new AppError({
      code: 'INVALID_ARGUMENT',
      message: 'storeId is required',
      status: 400,
    });
  }

  return { operatorId, storeId };
}
