// Exportable type declarations for RIME and emscripten helpers

export declare const IDBFS: any;

export declare const Module: {
  FS: {
    lookupPath: (path: string) => void;
    chdir: (path: string) => void;
    mkdir: (path: string) => void;
    readdir: (path: string) => string[];
    lstat: (path: string) => { mode: number };
    isDir: (mode: number) => boolean;
    rmdir: (path: string) => void;
    writeFile: (path: string, content: Uint8Array) => void;
    unlink: (path: string) => void;
    mount: (type: any, opts: {}, mountPoint: string) => void;
    syncfs: (read: boolean, callback: (err: any) => void) => void;
  };
  ccall: (name: string, returnType: string, argsType: string[], args: any[]) => any;
};

export type RIME_COMMITTED = {
  state: 0;
  committed: string;
};

export type RIME_ACCEPTED = {
  state: 1;
  committed?: string;
  head: string;
  body: string;
  tail: string;
  page: number;
  isLastPage: boolean;
  highlighted: number;
  selectLabels?: string[];
  candidates: {
    text: string;
    comment?: string;
  }[];
};

export type RIME_REJECTED = {
  state: 2;
  updatedSchema?: string;
};

export type RIME_UNHANDLED = {
  state: 3;
};

export type RIME_UPDATED_OPTIONS = {
  updatedOptions?: string[];
};

export type RIME_RESULT =
  (RIME_COMMITTED | RIME_ACCEPTED | RIME_REJECTED | RIME_UNHANDLED) &
  RIME_UPDATED_OPTIONS;

export type Language = 'zh-CN' | 'zh-TW' | 'zh-HK' | 'zh-SG';
