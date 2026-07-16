import api from "./api";

let cachedColumnsPromise = null;

export function getExcelColumns() {
  if (!cachedColumnsPromise) {
    cachedColumnsPromise = api
        .getRecipientColumns()
        .then((res) => res.data);
  }
  return cachedColumnsPromise;
}

export function invalidateExcelColumnsCache() {
  cachedColumnsPromise = null;
}