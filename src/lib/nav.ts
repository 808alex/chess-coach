import { useEffect, useState } from 'react';

export type Route = { page: string; arg?: string };

export function parseHash(): Route {
  const h = location.hash.replace(/^#\/?/, '');
  const [page, ...rest] = h.split('/');
  return { page: page || 'home', arg: rest.join('/') || undefined };
}

export function go(page: string, arg?: string) {
  location.hash = '/' + page + (arg ? '/' + arg : '');
}

export function useRoute() {
  const [r, setR] = useState(parseHash());
  useEffect(() => {
    const f = () => {
      setR(parseHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

// Hand-off between pages (e.g. "play this position", "review this game").
export type PlayRequest = { fen: string; elo?: number; userColor?: 'w' | 'b'; coach?: boolean; label?: string };
let pendingPlay: PlayRequest | null = null;
export function requestPlay(p: PlayRequest) {
  pendingPlay = p;
  go('play');
}
export function takePlayRequest() {
  const p = pendingPlay;
  pendingPlay = null;
  return p;
}

export type ReviewRequest = { gameId: string };
let pendingReview: ReviewRequest | null = null;
export function requestReview(r: ReviewRequest) {
  pendingReview = r;
  go('review', r.gameId);
}
export function takeReviewRequest() {
  const r = pendingReview;
  pendingReview = null;
  return r;
}
