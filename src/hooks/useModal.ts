/**
 * Reusable modal management hook
 *
 * Eliminates duplicate modal state management code across screens.
 * Provides consistent API for opening, closing, and toggling modals.
 *
 * Usage:
 *   const modal = useModal();
 *
 *   <Button onPress={modal.open} title="Open Modal" />
 *   <Modal visible={modal.isOpen} onRequestClose={modal.close}>
 *     ...
 *   </Modal>
 *
 * With data:
 *   const editModal = useModal<Prayer>();
 *
 *   <Button onPress={() => editModal.open(prayer)} />
 *   <Modal visible={editModal.isOpen}>
 *     {editModal.data && <EditForm prayer={editModal.data} />}
 *   </Modal>
 */

import { useState, useCallback } from 'react';

export interface ModalState<T = any> {
  isOpen: boolean;
  data: T | null;
}

export interface ModalControls<T = any> {
  isOpen: boolean;
  data: T | null;
  open: (data?: T) => void;
  close: () => void;
  toggle: () => void;
  setData: (data: T | null) => void;
}

/**
 * Hook for managing modal state
 *
 * @param initialOpen - Whether the modal should be open initially (default: false)
 * @returns Modal controls object
 */
export function useModal<T = any>(initialOpen: boolean = false): ModalControls<T> {
  const [state, setState] = useState<ModalState<T>>({
    isOpen: initialOpen,
    data: null,
  });

  const open = useCallback((data?: T) => {
    setState({
      isOpen: true,
      data: data ?? null,
    });
  }, []);

  const close = useCallback(() => {
    setState({
      isOpen: false,
      data: null,
    });
  }, []);

  const toggle = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOpen: !prev.isOpen,
    }));
  }, []);

  const setData = useCallback((data: T | null) => {
    setState((prev) => ({
      ...prev,
      data,
    }));
  }, []);

  return {
    isOpen: state.isOpen,
    data: state.data,
    open,
    close,
    toggle,
    setData,
  };
}

/**
 * Hook for managing multiple related modals
 *
 * Usage:
 *   const modals = useModalGroup(['create', 'edit', 'delete']);
 *
 *   <Button onPress={() => modals.open('create')} />
 *   <Modal visible={modals.isOpen('create')}>...</Modal>
 *
 *   <Button onPress={() => modals.open('edit', prayer)} />
 *   <Modal visible={modals.isOpen('edit')}>
 *     {modals.getData('edit') && <EditForm prayer={modals.getData('edit')} />}
 *   </Modal>
 */
export function useModalGroup<T = any>(modalKeys: string[]) {
  const [modals, setModals] = useState<Record<string, ModalState<T>>>(() => {
    const initial: Record<string, ModalState<T>> = {};
    modalKeys.forEach((key) => {
      initial[key] = { isOpen: false, data: null };
    });
    return initial;
  });

  const open = useCallback((key: string, data?: T) => {
    setModals((prev) => ({
      ...prev,
      [key]: { isOpen: true, data: data ?? null },
    }));
  }, []);

  const close = useCallback((key: string) => {
    setModals((prev) => ({
      ...prev,
      [key]: { isOpen: false, data: null },
    }));
  }, []);

  const closeAll = useCallback(() => {
    setModals((prev) => {
      const updated: Record<string, ModalState<T>> = {};
      Object.keys(prev).forEach((key) => {
        updated[key] = { isOpen: false, data: null };
      });
      return updated;
    });
  }, []);

  const toggle = useCallback((key: string) => {
    setModals((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        isOpen: !prev[key].isOpen,
      },
    }));
  }, []);

  const isOpen = useCallback(
    (key: string): boolean => {
      return modals[key]?.isOpen ?? false;
    },
    [modals]
  );

  const getData = useCallback(
    (key: string): T | null => {
      return modals[key]?.data ?? null;
    },
    [modals]
  );

  const setData = useCallback((key: string, data: T | null) => {
    setModals((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        data,
      },
    }));
  }, []);

  return {
    open,
    close,
    closeAll,
    toggle,
    isOpen,
    getData,
    setData,
  };
}
