import {
    WorkerIncomingEvent, WorkerInitEvent, WorkerOutgoingEvent, WorkerTraceEvent,
    WorkerUpdatePathsEvent
} from './shared/events';
import { EAST, getCell, patchCell, SOUTH } from './shared/maze';

const SOURCE_PATH_REF = -1 >>> 0;
const COMING_FROM_NORTH = 1;
const COMING_FROM_EAST = 2;
const COMING_FROM_SOUTH = 3;
const COMING_FROM_WEST = 4;

/**
 * State of the active maze
 */
let mazeId: string;
let mazeBuffer: Uint8Array;
let mazePaths: Uint32Array;
let dim: [number, number];

/**
 * Create a new maze using Eller's algorithm
 */
function generateEllersMaze() {
  const [W, H] = dim;
  mazeId = Math.random().toString(16);
  mazeBuffer = new Uint8Array(Math.ceil(2 * (W * H) / 8));

  let currentSetId = 1 >>> 0;
  let currentCellAssignments = new Uint32Array(W);

  for(let y = 0; y < H; y++) {
    const isLastRow = y === H - 1;

    for(let x = 0; x < W; x++) {
      // Assign set to alls cells still without a set
      if(!currentCellAssignments[x]) {
        currentCellAssignments[x] = currentSetId++;
      }

      // Merge random cells current row
      if(x > 0) {
        const currentSet = currentCellAssignments[x];
        const previousSet = currentCellAssignments[x - 1];

        // Merge horizontally randomly by default or always if it is the last row
        if(currentSet !== previousSet && (isLastRow || Math.random() > 0.5)) {
          // Assign the previous set to all cells with the current set (merge current set into previous)
          for(let x = 0; x < W; x++) {
            if(currentCellAssignments[x] === currentSet) {
              currentCellAssignments[x] = previousSet;
            }
          }

          // Connect cells horizontally
          patchCell(mazeBuffer, W, x - 1, y, EAST);
        }
      }
    }

    // Create vertical connections for all rows but the last row
    // All sets must have at least one connection to the next row
    if(!isLastRow) {
      // Create a new set assignment for the next row
      let nextCellAssignments = new Uint32Array(W);
      const connectedSets = new Set<number>();

      // Randomly connect cells vertically and keep track of connected sets for the next row
      for(let x = 0; x < W; x++) {
        if(Math.random() > 0.5) {
          nextCellAssignments[x] = currentCellAssignments[x];
          patchCell(mazeBuffer, W, x, y, SOUTH);
          connectedSets.add(currentCellAssignments[x]);
        }
      }

      // Connect all sets that have not already been connected vertically
      for(let x = 0; x < W; x++) {
        if(!connectedSets.has(currentCellAssignments[x])) {
          nextCellAssignments[x] = currentCellAssignments[x];
          patchCell(mazeBuffer, W, x, y, SOUTH);
          connectedSets.add(currentCellAssignments[x]);
        }
      }

      currentCellAssignments = nextCellAssignments;
    }
  }
}

/**
 * Generate paths from provided source cell to every other cell in the active maze
 */
function generatePathsTo([sourceX, sourceY]: [number, number]) {
  const [W, H] = dim;
  mazePaths = new Uint32Array(W * H);
  mazePaths[sourceY * W + sourceX] = SOURCE_PATH_REF;

  // The queue elements consist of [cellIndex, xCoord, yCoord, parentDirection]
  const queue: [number, number, number, number][] = [[sourceY * W + sourceX, sourceX, sourceY, 0]];

  // Process queue and add cells to check from current cell in any direction that is open
  // Available directions in east and south are checked for current cell, north and west directions
  // are checked in the cell above and to the left respectively
  while(queue.length > 0) {
    const [cellIndex, x, y, comingFrom] = queue.pop();
    const cellState = getCell(mazeBuffer, W, x, y);

    if(y > 0 && getCell(mazeBuffer, W, x, y - 1) & SOUTH && comingFrom !== COMING_FROM_NORTH) {
      const nextY = y - 1;
      const nextCellIndex = nextY * W + x;
      mazePaths[nextCellIndex] = cellIndex;
      queue.push([nextCellIndex, x, nextY, COMING_FROM_SOUTH]);
    }
    if(cellState & EAST && comingFrom !== COMING_FROM_EAST) {
      const nextX = x + 1;
      const nextCellIndex = y * W + nextX;
      mazePaths[nextCellIndex] = cellIndex;
      queue.push([nextCellIndex, nextX, y, COMING_FROM_WEST]);
    }
    if(cellState & SOUTH && comingFrom !== COMING_FROM_SOUTH) {
      const nextY = y + 1;
      const nextCellIndex = nextY * W + x;
      mazePaths[nextCellIndex] = cellIndex;
      queue.push([nextCellIndex, x, nextY, COMING_FROM_NORTH]);
    }
    if(x > 0 && getCell(mazeBuffer, W, x - 1, y) & EAST && comingFrom !== COMING_FROM_WEST) {
      const nextX = x - 1;
      const nextCellIndex = y * W + nextX;
      mazePaths[nextCellIndex] = cellIndex;
      queue.push([nextCellIndex, nextX, y, COMING_FROM_EAST]);
    }
  }
}

/**
 * Trace a path to the provided cell
 */
function tracePathTo([x, y]: [number, number]) {
  const [W] = dim;
  const cellIndex = y * W + x;
  const path: [number, number][] = [[x, y]];
  let parentIndex = mazePaths[cellIndex];
  while(parentIndex != null && parentIndex !== SOURCE_PATH_REF) {
    const parentX = parentIndex % W;
    const parentY = (parentIndex / W) >>> 0;
    path.unshift([parentX, parentY]);
    parentIndex = mazePaths[parentIndex];
  }

  return path;
}

/**
 * Initialize a new maze, trace an initial path and emit buffer and path
 */
function init(event: WorkerInitEvent) {
  dim = event.dim;
  generateEllersMaze();
  generatePathsTo(event.source);
  sendEvent({ type: 'MazeBuffer', buffer: mazeBuffer, mazeId, dim });
  sendEvent({ type: 'Path', mazeId, path: tracePathTo(event.trace) });
}

/**
 * Update maze paths with provided source cell and emit an empty path
 */
function updatePaths(event: WorkerUpdatePathsEvent) {
  if(mazeBuffer == null || event.mazeId !== mazeId) { return; }
  generatePathsTo(event.source);
  sendEvent({ type: 'Path', path: [], mazeId });
}

/**
 * Trace and emit path to provided target cell
 */
function tracePath(event: WorkerTraceEvent) {
  if(mazePaths == null || event.mazeId !== mazeId) { return; }
  sendEvent({ type: 'Path', mazeId, path: tracePathTo(event.cell) });
}

function handleEvent(event: WorkerOutgoingEvent) {
  switch(event.type) {
    case 'Init': return init(event);
    case 'UpdatePaths': return updatePaths(event);
    case 'Trace': return tracePath(event);
  }
}

function sendEvent(event: WorkerIncomingEvent) {
  (self as unknown as Worker).postMessage(event);
}

self.onmessage = msg => handleEvent(msg.data)
