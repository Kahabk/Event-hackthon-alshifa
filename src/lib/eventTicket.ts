export const EVENT_ID = 'shifa-sdg-2026';
export const EVENT_TICKET_TYPE = 'shifa-event-ticket';
export const EVENT_TICKET_VERSION = 1 as const;

export interface EventTicketSource {
  teamId?: string;
  teamNameKey?: string;
  registrationId?: string;
  ticketId?: string;
}

export type TicketValidationStatus = 'verified-ticket' | 'legacy-qr' | 'manual-lookup' | 'invalid';

export interface ParsedEventTicket {
  raw: string;
  candidates: string[];
  eventId?: string;
  teamId?: string;
  registrationId?: string;
  ticketId?: string;
  version?: number;
  validationStatus: TicketValidationStatus;
  error?: string;
}

export const createTicketId = () => {
  const secureCrypto = globalThis.crypto;
  if (!secureCrypto) throw new Error('Secure ticket generation is not available in this browser.');
  if (typeof secureCrypto.randomUUID === 'function') return secureCrypto.randomUUID();
  const bytes = new Uint8Array(16);
  secureCrypto.getRandomValues(bytes);
  return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
};

export const createEventTicketPayload = (source: EventTicketSource) => JSON.stringify({
  v: EVENT_TICKET_VERSION,
  type: EVENT_TICKET_TYPE,
  eventId: EVENT_ID,
  ticketId: source.ticketId || '',
  registrationId: source.registrationId || '',
  teamId: source.teamId || source.teamNameKey || '',
});

const normalize = (value: unknown) => String(value || '').trim();
const normalizeEvent = (value: unknown) => normalize(value).toLowerCase().replace(/[^a-z0-9]/g, '');
const isCurrentEvent = (value: unknown) => {
  const event = normalizeEvent(value);
  return !event || event === normalizeEvent(EVENT_ID) || event === normalizeEvent('Shifa SDG');
};

const addCandidate = (set: Set<string>, value?: unknown) => {
  const text = normalize(value);
  if (!text) return;
  set.add(text);
  try { set.add(decodeURIComponent(text)); } catch { /* Plain strings are expected. */ }
};

export const parseEventTicketPayload = (rawValue: string): ParsedEventTicket => {
  const raw = rawValue.trim();
  const candidates = new Set<string>();
  if (!raw) return { raw, candidates: [], validationStatus: 'invalid', error: 'Empty QR or search text.' };

  addCandidate(candidates, raw);
  try {
    const data = JSON.parse(raw) as Record<string, unknown>;
    const type = normalize(data.type);
    if (type === EVENT_TICKET_TYPE) {
      const version = Number(data.v);
      const eventId = normalize(data.eventId);
      const ticketId = normalize(data.ticketId);
      const registrationId = normalize(data.registrationId);
      const teamId = normalize(data.teamId);
      if (version !== EVENT_TICKET_VERSION) {
        return { raw, candidates: [], version, eventId, validationStatus: 'invalid', error: 'This ticket version is not supported.' };
      }
      if (!isCurrentEvent(eventId)) {
        return { raw, candidates: [], version, eventId, validationStatus: 'invalid', error: 'This ticket belongs to another event.' };
      }
      if (!ticketId || !registrationId || !teamId) {
        return { raw, candidates: [], version, eventId, validationStatus: 'invalid', error: 'This ticket is incomplete or damaged.' };
      }
      [ticketId, registrationId, teamId].forEach(value => addCandidate(candidates, value));
      return {
        raw, candidates: Array.from(candidates), eventId, teamId, registrationId, ticketId, version,
        validationStatus: 'verified-ticket',
      };
    }

    const eventId = normalize(data.eventId || data.event);
    if (!isCurrentEvent(eventId)) {
      return { raw, candidates: [], eventId, validationStatus: 'invalid', error: 'This QR belongs to another event.' };
    }
    const registrationId = normalize(data.registrationId || data.registration);
    const teamId = normalize(data.teamId || data.teamID || data.id);
    const teamName = normalize(data.teamName || data.team);
    [registrationId, teamId, teamName].forEach(value => addCandidate(candidates, value));
    if (registrationId || teamId || teamName) {
      return {
        raw, candidates: Array.from(candidates), eventId, teamId, registrationId,
        validationStatus: 'legacy-qr',
      };
    }
  } catch {
    // URL and plain-text tickets are handled below.
  }

  try {
    const url = new URL(raw);
    const eventId = normalize(url.searchParams.get('eventId') || url.searchParams.get('event'));
    if (!isCurrentEvent(eventId)) {
      return { raw, candidates: [], eventId, validationStatus: 'invalid', error: 'This ticket belongs to another event.' };
    }
    ['teamId', 'team', 'registrationId', 'registration', 'id', 'qr'].forEach(key => addCandidate(candidates, url.searchParams.get(key)));
    url.pathname.split('/').filter(Boolean).forEach(part => addCandidate(candidates, part));
    return { raw, candidates: Array.from(candidates), eventId, validationStatus: 'legacy-qr' };
  } catch {
    // Plain text is a manual registration/team lookup.
  }

  const registrationMatch = raw.match(/SDG-[A-Z0-9-]+/i)?.[0]?.toUpperCase();
  addCandidate(candidates, registrationMatch);
  return {
    raw,
    candidates: Array.from(candidates),
    registrationId: registrationMatch,
    validationStatus: 'manual-lookup',
  };
};
