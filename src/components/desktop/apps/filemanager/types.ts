export type FileManagerEntry =
  | {
      type: "folder";
      name: string;
      path: string;
    }
  | {
      type: "file";
      name: string;
      path: string;
    };
