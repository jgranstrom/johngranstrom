import './styles.scss';

import { renderMaze, renderPath } from './render';
import { WorkerIncomingEvent, WorkerOutgoingEvent } from './shared/events';

const TARGET_CELL_SIZE = 10;
const seedButton = document.getElementById('seed') as HTMLDivElement;
const canvases = [].slice.call(document.getElementsByTagName('canvas')) as HTMLCanvasElement[];
const contexts = canvases.map(canvas => canvas.getContext('2d'));

let activeMazeContext = contexts[0];
let activePathContext = contexts[2];
let sizeChangeTimeout: any;
let worker: Worker;

/**
 * State of active maze
 */
let mazeId: string;
let mazeBuffer: Uint8Array;
let mazePath: [number, number][];
let dim: [number, number] = [0, 0];
let cellSize: [number, number] = [0, 0];
let activeCell: [number, number] = [-1, -1];
let sourceCell: [number, number] = [0, 0];
let touching = false;

/**
 * Update canvas sizes based on window size
 */
function updateCanvasSizes() {
  canvases.forEach(canvas => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  });
}

/**
 * Update cell sizes based on window size and current dimensions
 */
function updateCellSize() {
  cellSize = [window.innerWidth / dim[0], window.innerHeight / dim[1]];
}

/**
 * Find a cell from pixel coordinates
 */
function findCell(x: number, y: number): [number, number] {
  return [(x / cellSize[0]) >>> 0, (y / cellSize[1]) >>> 0];
}

/**
 * Trace path to cell under mouse pointer
 */
function onMouseMove(x: number, y: number) {
  const cell = findCell(x, y);
  if(cell[0] !== activeCell[0] || cell[1] !== activeCell[1]) {
    activeCell = cell;
    sendEvent({ type: 'Trace', mazeId, cell });
  }
}

/**
 * Change source point to cell under mouse pointer
 */
function onMouseClick(x: number, y: number) {
  if(touching) { return; }
  const cell = findCell(x, y);
  if(cell[0] !== sourceCell[0] || cell[1] !== sourceCell[1]) {
    sourceCell = cell;
    sendEvent({ type: 'UpdatePaths', source: cell, mazeId });
  }
}

/**
 * Generate a new maze and trace to cell under mouse pointer
 */
function onGenerateClick(event: MouseEvent | TouchEvent, x: number, y: number) {
  event.stopPropagation();
  mazeId = null;
  const cell = findCell(x, y);
  sendEvent({ type: 'Init', source: sourceCell, trace: cell, dim });
}

/**
 * Flip active state between two canvas contexts
 */
function flipActive(active: CanvasRenderingContext2D, contextA: CanvasRenderingContext2D, contextB: CanvasRenderingContext2D) {
  active.canvas.classList.remove('active');
  const nextActive = active === contextA ? contextB : contextA;
  nextActive.canvas.classList.add('active');
  return nextActive;
}

/**
 * Handle each worker event
 */
function handleEvent(event: WorkerIncomingEvent) {
  if(event.type === 'MazeBuffer') {
    activeMazeContext = flipActive(activeMazeContext, contexts[0], contexts[1]);
    activePathContext = flipActive(activePathContext, contexts[2], contexts[3]);
    mazeBuffer = event.buffer;
    mazeId = event.mazeId;
    mazePath = [];
    dim = event.dim;
    updateCellSize();
    renderMaze(activeMazeContext, mazeBuffer, dim, cellSize);
    renderPath(activePathContext, mazePath, cellSize);
  } else if(event.type === 'Path' && event.mazeId === mazeId) {
    mazePath = event.path;
    renderPath(activePathContext, mazePath, cellSize);
  }
}

/**
 * Compute maze dimensions from window size and target cell size
 */
function determineDimensions(): [number, number] {
  return [(window.innerWidth / TARGET_CELL_SIZE) >>> 0, (window.innerHeight / TARGET_CELL_SIZE) >>> 0];
}

/**
 * Create a new maze with dimensions provided, debounce by some time to avoid excessive maze generation
 */
function requestDimensionChange(optimalDimensions: [number, number]) {
  clearTimeout(sizeChangeTimeout);
  sizeChangeTimeout = setTimeout(() => {
    sourceCell = [0, 0];
    updateCanvasSizes();
    updateCellSize();
    sendEvent({ type: 'Init', source: sourceCell, dim: optimalDimensions, trace: [(optimalDimensions[0] / 2) << 0, (optimalDimensions[1] / 2) << 0]});
  }, 300);
}

/**
 * Update cell sizes and request to change dimensions if they have changed given new window size
 */
function onResize() {
  updateCanvasSizes();
  updateCellSize();
  const optimalDimensions = determineDimensions();
  if(optimalDimensions[0] !== dim[0] || optimalDimensions[1] !== dim[1]) {
    requestDimensionChange(optimalDimensions);
  } else {
    renderMaze(activeMazeContext, mazeBuffer, dim, cellSize);
    renderPath(activePathContext, mazePath, cellSize);
  }
}

/**
 * Proxy touch move as mouse movement and stop default behavior
 */
function onTouchMove(event: TouchEvent) {
  event.preventDefault();
  onMouseMove(event.touches[0].clientX, event.touches[0].clientY);
}

function onTouchStart(event: TouchEvent) {
  touching = true;
  onMouseMove(event.touches[0].clientX, event.touches[0].clientY);
}

/**
 * Initialize worker, add event listeners and create initial maze
 */
function init() {
  worker = new Worker('./worker.ts');
  document.addEventListener('mousemove', event => onMouseMove(event.clientX, event.clientY));
  document.addEventListener('click', event => onMouseClick(event.clientX, event.clientY));
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchstart', onTouchStart);
  seedButton.addEventListener('touchstart', event => event.stopPropagation());
  seedButton.addEventListener('click', event => onGenerateClick(event, event.clientX, event.clientY));
  window.addEventListener('resize', () => onResize());
  worker.onmessage = msg => handleEvent(msg.data);

  updateCanvasSizes();
  const optimalDimensions = determineDimensions();
  dim = optimalDimensions;
  sendEvent({ type: 'Init', source: sourceCell, dim: optimalDimensions, trace: [(optimalDimensions[0] / 2) << 0, (optimalDimensions[1] / 2) << 0 ]});
}

function sendEvent(event: WorkerOutgoingEvent) {
  worker.postMessage(event);
}

/**
 * Initialize only if browser support is detected
 */
if(typeof Worker === 'function' && typeof Uint8Array === 'function') {
  init();
}