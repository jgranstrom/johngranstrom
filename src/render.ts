import { EAST, getCell, SOUTH } from './shared/maze';

/**
 * Render maze buffer to provided canvas context using provided dimensions and cell sizes
 */
export function renderMaze(context: CanvasRenderingContext2D, buffer: Uint8Array, [W, H]: [number, number], [cellWidth, cellHeight]: [number, number]) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  if(!buffer) { return; }

  context.strokeStyle = '#242424';
  context.lineWidth = 1.5;
  context.beginPath();

  for(let x = 0; x < W; x++) {
    for(let y = 0; y < H; y++) {
      const cellState = getCell(buffer, W, x, y);
      const cellX = x * cellWidth;
      const cellY = y * cellHeight;

      if(!(cellState & EAST)) {
        context.moveTo(cellX + cellWidth, cellY);
        context.lineTo(cellX + cellWidth, cellY + cellHeight);
      }
      if(!(cellState & SOUTH)) {
        context.moveTo(cellX, cellY + cellHeight);
        context.lineTo(cellX + cellWidth, cellY + cellHeight);
      }
    }
  }

  context.stroke();
}

/**
 * Render maze path to provided context using provided cell sizes
 */
export function renderPath(context: CanvasRenderingContext2D, path: [number, number][], [cellWidth, cellHeight]: [number, number]) {
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  if(!path || path.length === 0) { return; }

  const innerCellWidth = cellWidth - 4;
  const innerCellHeight = cellHeight - 4;

  context.fillStyle = 'rgb(10, 20, 30)';
  let [lastX, lastY] = path[0];
  context.fillRect(lastX * cellWidth + 2, lastY * cellHeight + 2, innerCellWidth, innerCellHeight);

  for(let i = 1; i < path.length; i++) {
    const p = i / (path.length - 1);
    context.fillStyle = `rgb(${(3 + 10 * p) << 0}, ${(20 + 37 * p) << 0}, ${(30 + 46 * p) << 0})`;
    const [x, y] = path[i];
    const xCoord = x * cellWidth + 2;
    const yCoord = y * cellHeight + 2;

    lastX === x ?
      lastY < y
        ? context.fillRect(xCoord, yCoord - 5, innerCellWidth, innerCellHeight + 5)
        : context.fillRect(xCoord, yCoord, innerCellWidth, innerCellHeight + 5)
      : lastX < x
        ? context.fillRect(xCoord - 5, yCoord, innerCellWidth + 5, innerCellHeight)
        : context.fillRect(xCoord, yCoord, innerCellWidth + 5, innerCellHeight)
    ;
    lastX = x;
    lastY = y;
  }
}