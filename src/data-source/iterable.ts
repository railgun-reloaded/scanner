type IterableSource<T> = ReadableStream<T> | AsyncIterable<T>

/**
 *  `SourceReader` is a utility class that provides a unified interface
 */
class SourceReader<T> {
  /**
   * `read` is a method that reads data from a given source.
   * @param source - The source to read data from. It can be a ReadableStream or an AsyncIterable.
   * @returns An AsyncGenerator that yields data from the source.
   * @throws Error if the source is not a ReadableStream or an AsyncIterable.
   * @yields T - The data read from the source.
   */
  async * read (source: IterableSource<T>): AsyncGenerator<T> {
    if (isReadableStream(source)) {
      const reader = source.getReader()
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          yield value
        }
      } finally {
        reader.releaseLock()
      }
    } else if (isAsyncIterable(source)) {
      for await (const item of source) {
        yield item
      }
    } else {
      throw new Error('Unsupported data source')
    }
  }
}

// --- 🔍 Type Guards ---
/**
 * TODO:
 * @param source TODO
 * @returns source is ReadableStream<T>
 */
function isReadableStream<T> (source: any): source is ReadableStream<T> {
  return typeof source?.getReader === 'function'
}

/**
 * TODO:
 * @param source TODO
 * @returns source is AsyncIterable<T>
 */
function isAsyncIterable<T> (source: any): source is AsyncIterable<T> {
  return typeof source?.[Symbol.asyncIterator] === 'function'
}

export { SourceReader, isReadableStream, isAsyncIterable }
