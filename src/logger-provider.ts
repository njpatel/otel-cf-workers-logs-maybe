import { logs, Logger, LoggerOptions, LoggerProvider } from '@opentelemetry/api-logs'
import { LogRecordProcessor } from '@opentelemetry/sdk-logs'
import { Resource } from '@opentelemetry/resources'

export class WorkerLoggerProvider implements LoggerProvider {
	private processors: LogRecordProcessor[]
	private resource: Resource
	private loggers: Record<string, Logger> = {}

	constructor(processors: LogRecordProcessor[], resource: Resource) {
		this.processors = processors
		this.resource = resource
	}

	getLogger(name: string, version?: string, options?: LoggerOptions): Logger {
		const key = `${name}@${version || ''}:${options?.schemaUrl || ''}`
		if (!this.loggers[key]) {
			const provider = new (logs.getLoggerProvider().constructor as typeof LoggerProvider)({ resource: this.resource })
			this.processors.forEach((p) => provider.addLogRecordProcessor(p))
			this.loggers[key] = provider.getLogger(name, version, options)
		}
		return this.loggers[key]!
	}

	register(): void {
		logs.setGlobalLoggerProvider(this)
	}

	addLogRecordProcessor(processor: LogRecordProcessor): void {
		this.processors.push(processor)
	}

	async forceFlush(): Promise<void> {
		for (const p of this.processors) {
			await p.forceFlush()
		}
	}
}
