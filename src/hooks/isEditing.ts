import { useSyncExternalStore } from 'react';

// Observe the dashboard DOM to detect editing state.
// This is a very hacky workaround.

const selectors = [
  '*[data-testid="data-testid Exit edit mode button"]',
  '*[data-testid="data-testid Panel editor content"]',
].join(', ');

const subscribe = (onStoreChange: () => void) => {
  const observer = new MutationObserver(() => onStoreChange());

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false,
  });

  return () => observer.disconnect();
};

const getSnapshot = () => !!document.querySelector(selectors);

export default () => useSyncExternalStore(subscribe, getSnapshot);
