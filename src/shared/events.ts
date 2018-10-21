export type WorkerOutgoingEventType = 'Init' | 'Trace' | 'UpdatePaths';
export type WorkerIncomingEventType = 'MazeBuffer' | 'Path';

export interface WorkerOutgoingBaseEvent<T extends WorkerOutgoingEventType> { type: T; }
export interface WorkerIncomingBaseEvent<T extends WorkerIncomingEventType> { type: T; }

export interface WorkerInitEvent extends WorkerOutgoingBaseEvent<'Init'> {
  dim: [number, number];
  source: [number, number];
  trace: [number, number];
};

export interface WorkerUpdatePathsEvent extends WorkerOutgoingBaseEvent<'UpdatePaths'> {
  mazeId: string;
  source: [number, number];
};

export interface WorkerTraceEvent extends WorkerOutgoingBaseEvent<'Trace'> {
  mazeId: string;
  cell: [number, number];
};

export interface WorkerMazeBufferEvent extends WorkerIncomingBaseEvent<'MazeBuffer'> {
  mazeId: string;
  buffer: Uint8Array;
  dim: [number, number];
};

export interface WorkerPathEvent extends WorkerIncomingBaseEvent<'Path'> {
  mazeId: string;
  path: [number, number][];
}

export type WorkerOutgoingEvent =
  | WorkerInitEvent
  | WorkerUpdatePathsEvent
  | WorkerTraceEvent

export type WorkerIncomingEvent =
  | WorkerMazeBufferEvent
  | WorkerPathEvent
