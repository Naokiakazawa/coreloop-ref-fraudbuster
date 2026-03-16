export type DateLike = Date | string | null | undefined;
const JST_OFFSET_MS = 9 * 60 * 60 * 1000;

function parseDate(value: DateLike): Date | null {
	if (!value) return null;
	if (value instanceof Date) {
		return Number.isNaN(value.getTime()) ? null : value;
	}

	if (typeof value === "string") {
		const parsed = new Date(value);
		return Number.isNaN(parsed.getTime()) ? null : parsed;
	}

	return null;
}

function getJstShiftedDate(date: Date): Date {
	return new Date(date.getTime() + JST_OFFSET_MS);
}

export function formatDate(
	value: DateLike,
	locale = "ja-JP",
	options?: Intl.DateTimeFormatOptions,
): string | null {
	const date = parseDate(value);
	if (!date) return null;
	return new Intl.DateTimeFormat(locale, options).format(date);
}

export function getStartOfJstDay(value: DateLike = new Date()): Date {
	const date = parseDate(value) ?? new Date();
	const shifted = getJstShiftedDate(date);

	return new Date(
		Date.UTC(
			shifted.getUTCFullYear(),
			shifted.getUTCMonth(),
			shifted.getUTCDate(),
		) - JST_OFFSET_MS,
	);
}

export function getJstDateKey(value: DateLike): string | null {
	const date = parseDate(value);
	if (!date) return null;

	const shifted = getJstShiftedDate(date);
	const year = shifted.getUTCFullYear();
	const month = `${shifted.getUTCMonth() + 1}`.padStart(2, "0");
	const day = `${shifted.getUTCDate()}`.padStart(2, "0");

	return `${year}-${month}-${day}`;
}
