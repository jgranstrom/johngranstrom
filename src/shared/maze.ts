/**
 * Each cell in the maze is represented by two bits to represent the state of its east and south borders
 * 00: there is no opening
 * 01: there is an opening on the east border of the cell
 * 10: there is an opening on the south border of the cell
 * 11: there is an opening on both east and south borders of the cell
 */

export const EAST = 1 << 0;
export const SOUTH = 1 << 1;

/**
 * Get the cell state (2 bits) in a buffer for the provided coordinates
 */
export function getCell(buffer: Uint8Array, W: number, x: number, y: number) {
  const cellPosition = y * W + x;
  const cellBytePosition = cellPosition >> 2;
  const cellBitShift = 6 - (cellPosition % 4) * 2;
  const cellMask = 0x3 << cellBitShift;
  return (buffer[cellBytePosition] & cellMask) >>> cellBitShift;
}

/**
 * Enable any provided 1-bits for a cell in a buffer for the provided coordinates
 */
export function patchCell(buffer: Uint8Array, W: number, x: number, y: number, state: number) {
  const cellPosition = y * W + x;
  const cellBytePosition = cellPosition >> 2;
  const cellBitShift = 6 - (cellPosition % 4) * 2;
  const cellUpdatedState = state << cellBitShift;
  buffer[cellBytePosition] = buffer[cellBytePosition] | cellUpdatedState;
}
