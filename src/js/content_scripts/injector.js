import { openWindow, sendToBackground } from '../bgmessage.js';
import { mdiOpenInNew, mdiYoutubeTv, mdiIframeArray } from '@mdi/js';

for (const eventName of ['visibilitychange', 'webkitvisibilitychange', 'blur']) {
  window.addEventListener(eventName, e => e.stopImmediatePropagation(), true);
}

const styleLiveTLButton = (a, color) => {
  a.style.backgroundColor = `${color || 'rgb(0, 153, 255)'}`;
  a.style.font = 'inherit';
  a.style.fontSize = '11px';
  a.style.fontWeight = 'bold';
  a.style.width = '100%';
  a.style.margin = 0;
  a.style.textAlign = 'center';
  a.style.display = 'inline-block';
  // a.style.boxShadow = 'rgb(194 194 194) 0px 0px 4px 1px inset';
};
  
const setLiveTLButtonAttributes = (a) => {
  [
    'yt-simple-endpoint',
    'style-scope',
    'ytd-toggle-button-renderer'
  ].forEach(c => a.classList.add(c));
  a.tabindex = '-1';
};

const getLiveTLButton = (color) => {
  const a = document.createElement('a');
  setLiveTLButtonAttributes(a);
  styleLiveTLButton(a, color);
  a.innerHTML = `
  <paper-button id="button" class="style-scope ytd-toggle-button-renderer livetlActivator" role="button" tabindex="0" animated=""
  elevation="0" aria-disabled="false" style="
    padding: 5px;
    display: inline-block;
    margin: 0;
    height: auto !important;
  ">
    <yt-formatted-string id="text" class="style-scope ytd-toggle-button-renderer" style="display: block;">
    </yt-formatted-string>
    <paper-ripple class="style-scope paper-button">
      <div id="background" class="style-scope paper-ripple" style="opacity: 0.00738;"></div>
      <div id="waves" class="style-scope paper-ripple"></div>
    </paper-ripple>
    <paper-ripple class="style-scope paper-button">
      <div id="background" class="style-scope paper-ripple" style="opacity: 0.007456;"></div>
      <div id="waves" class="style-scope paper-ripple"></div>
    </paper-ripple>
    <paper-ripple class="style-scope paper-button">
      <div id="background" class="style-scope paper-ripple" style="opacity: 0.007748;"></div>
      <div id="waves" class="style-scope paper-ripple"></div>
    </paper-ripple>
  </paper-button>
  `;
  a.style.height = '100%';
  a.style.display = 'flex';
  a.style.justifyContent = 'center';
  return a;
};

const makeButton = (text, callback, color='rgb(0, 153, 255)', icon='') => {
  let a = document.createElement('span');
  a.style.flexGrow = 1;
  a.style.flexBasis = 0;
  a.style.position = 'relative';
  a.appendChild(getLiveTLButton(color));
  const e = document.querySelector('#input-panel');
  let elem = e.querySelector('.livetlButtonWrapper');
  if (!elem) {
    elem = document.createElement('div');
    elem.className = 'livetlButtonWrapper';
    elem.style.display = 'flex';
    e.appendChild(elem);
  }
  elem.appendChild(a);
  a.querySelector('a').addEventListener('click', callback);
  const textbox = a.querySelector('yt-formatted-string');
  const svg = document.createElement('svg');
  textbox.textContent = text;
  textbox.appendChild(svg);
  textbox.style.color = 'white';
  svg.outerHTML = `
    <svg viewBox="0 0 24 24" style="
      height: 15px;
      vertical-align: bottom;
      margin-left: 5px;
    ">
      <path d="${icon}" fill="white"></path>
    </svg>
  `;
};

const constructParams = () => {
  const params = new URLSearchParams(window.location.search);
  params.set(
    'video',
    (
      params.get('v') ||
      (new URLSearchParams(window.parent.location.search).get('v'))
    )
  );
  if (window.location.pathname.includes('live_chat_replay')) {
    params.set('isReplay', true);
  }
  return params;
};

async function loaded() {
  const elem = document.querySelector('yt-live-chat-app');
  elem.style.minWidth = '0px';
  elem.style.minHeight = '0px';
  elem.style.width = '100%';
  elem.style.height = '100%';
  elem.style.maxWidth = undefined;
  elem.style.maxHeight = undefined;
  const body = document.querySelector('body');
  body.style.width = '100%';
  body.style.height = '100%';
  body.style.position = 'fixed';
  const css = `
    .livetlButtonWrapper a.ytd-toggle-button-renderer:hover {
      background-color: #0099ffb5 !important;
    }
    .livetlButtonWrapper a.ytd-toggle-button-renderer {
      transition: 0.1s;
    }
  `;
  const style = document.createElement('style');
  style.innerHTML = css;
  body.appendChild(style);

  if (document.querySelector('.livetlButtonWrapper')) {
    console.debug('LTL buttons already injected. Skipping injection');
    return;
  }

  const params = new URLSearchParams(window.location.search);
  if (params.get('embed_domain') === chrome.runtime.id) {
    console.debug('Chat is in extension, not injecting LTL buttons.');
    return;
  }

  /** Start buttons injections */
  makeButton('Open LiveTL', () => {
    window.top.location =
      chrome.runtime.getURL(`watch.html?${constructParams().toString()}`);
  }, undefined, mdiYoutubeTv);
  const tabid = await sendToBackground({
    type:'tabid'
  });
  window.addEventListener('message', (d) => {
    if (d.data['yt-player-video-progress']) {
      sendToBackground({
        type: 'message',
        data: { ...d.data, tabid },
      });
    }
  });
  // TODO: set tabid and frameid on popout params
  makeButton('TL Popout', () => {
    let popoutParams = constructParams();
    popoutParams.set('tabid', tabid);
    try{
      popoutParams.set(
        'title',
        window.parent.document.querySelector('#container > .title').textContent
      );
    }
    catch (e) {
      if (e instanceof DOMException) {
        console.debug('Ignored expected CORS error', { e });
      }
      else {
        throw e;
      }
    }
    openWindow(
      chrome.runtime.getURL(`popout.html?${popoutParams.toString()}`)
    );
  }, undefined, mdiOpenInNew);
  makeButton('Embed TLs', () => {
    let embeddedParams = constructParams();
    embeddedParams.set('embedded', true);
    embeddedParams.set('tabid', tabid);
    document.body.outerHTML = '';
    const iframe = document.createElement('iframe');
    iframe.style.width = '100%';
    iframe.style.height = '100%';
    iframe.style.position = 'fixed';
    iframe.src =
      chrome.runtime.getURL(`watch.html?${embeddedParams.toString()}`);
    document.body.appendChild(iframe);
    window.addEventListener('message', (d) => {
      iframe.contentWindow.postMessage(d.data, '*');
    });
  }, undefined, mdiIframeArray);
}

window.addEventListener('message', (packet) => {
  if (packet.origin !== window.origin) window.postMessage(packet.data);
});

/**
 * Load on DOMContentLoaded or later.
 * Does not matter unless run_at is specified in manifest.
 */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loaded);
} else {
  loaded();
}
