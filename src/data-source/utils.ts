/**
 * promiseTimeout
 * @param promise - The promise to be timed out
 * @param ms - The timeout in milliseconds
 * @param message   - The message to be returned if the promise times out
 */
const promiseTimeout = <T>(promise: Promise<T>, ms: number, message?: string): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Promise timed out'))
    }, ms)

    promise
      .then((result) => {
        clearTimeout(timeout)
        resolve(result)
      })
      .catch((error) => {
        clearTimeout(timeout)
        if (message) {
          reject(message)
        }
        reject(error)
      })
  })
}
/**
 * delay
 * @param ms - The delay in milliseconds
 * @returns A promise that resolves after the specified delay
 */
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export { promiseTimeout, delay }
