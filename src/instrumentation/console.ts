import { logs, SeverityNumber } from '@opentelemetry/api-logs'

const LEVELS: Record<string, SeverityNumber> = {
	log: SeverityNumber.INFO,
	info: SeverityNumber.INFO,
	warn: SeverityNumber.WARN,
	error: SeverityNumber.ERROR,
}

export function instrumentConsole() {
	const logger = logs.getLogger('console')
	const originals: Record<string, (...args: any[]) => void> = {
		log: console.log,
		info: console.info,
		warn: console.warn,
		error: console.error,
	}
	for (const level of Object.keys(originals)) {
		console[level as 'log'] = (...args: any[]) => {
			logger.emit({
				severityNumber: LEVELS[level],
				severityText: level.toUpperCase(),
				body: args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '),
			})
			originals[level](...args)
		}
	}
}
