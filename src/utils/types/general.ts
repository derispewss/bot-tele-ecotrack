export interface IPendaftar {
  telegram_id: number;
  nama: string;
  hari: string;
  jam: string;
  tanggal: string;
}

export interface IUserState {
  step: "nama" | "hari" | "jam" | "edit" | "done";
  nama?: string;
  hari?: string;
  jam?: string;
}
