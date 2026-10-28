/** Lets controls outside the home page (the header's Send key) open its file picker. */
const EVENT = 'relay:send';
let pending = false;
export function requestSend() {
  pending = !window.dispatchEvent(new CustomEvent(EVENT, { cancelable: true })) ? false : true;
}
/** Home calls this: runs `open` now, and again for a request that arrived before it mounted. */
export function onSendRequest(open: () => void) {
  const h = (e: Event) => { e.preventDefault(); open(); };
  window.addEventListener(EVENT, h);
  if (pending) { pending = false; open(); }
  return () => window.removeEventListener(EVENT, h);
}
