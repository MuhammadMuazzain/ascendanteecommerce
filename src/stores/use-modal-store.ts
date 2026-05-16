import { create } from "zustand";

interface IModalStore {
  modalPricing: boolean;
  setModalPricing: (modalPricing: boolean) => void;
  modalSignin: boolean;
  setModalSignin: (modalSignin: boolean) => void;
}

export const useModalStore = create<IModalStore>((set) => ({
  modalPricing: false,
  setModalPricing: (modalPricing) => set({ modalPricing }),
  modalSignin: false,
  setModalSignin: (modalSignin) => set({ modalSignin }),
}));
