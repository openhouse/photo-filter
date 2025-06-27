export interface PhotoData {
  uuid: string;
  originalFilename: string;
  date: string; // or a Date if you parse it
  persons?: string[];
  // ...
}
