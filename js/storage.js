// use this in case the storage is disabled
const mockStorage = {} 

export const getStorage = () => {
  try {
    return window.localStorage
      ? window.localStorage
      : mockStorage
  } catch (e) {
    return mockStorage
  }
}