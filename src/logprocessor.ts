import { LogRecordExporter, ReadableLogRecord, LogRecordProcessor } from '@opentelemetry/sdk-logs'
import { ExportResultCode } from '@opentelemetry/core'
import { scheduler } from 'cloudflare:workers'

class LogState {
	private unexported: ReadableLogRecord[] = []
	private exporter: LogRecordExporter
	private exportPromises: Promise<void>[] = []

	constructor(exporter: LogRecordExporter) {
		this.exporter = exporter
	}

	add(record: ReadableLogRecord) {
		this.unexported.push(record)
	}

	async flush(): Promise<void> {
		if (this.unexported.length > 0) {
			await scheduler.wait(1)
			const records = this.unexported
			this.unexported = []
			const promise = new Promise<void>((resolve, reject) => {
				this.exporter.export(records, (result) => {
					if (result.code === ExportResultCode.SUCCESS) {
						resolve()
					} else {
						reject(result.error)
					}
				})
			})
			this.exportPromises.push(promise)
			await promise
		}
		if (this.exportPromises.length > 0) {
			await Promise.allSettled(this.exportPromises)
		}
	}
}

export class BatchLogRecordProcessor implements LogRecordProcessor {
	private readonly state: LogState
	constructor(private exporter: LogRecordExporter) {
		this.state = new LogState(exporter)
	}

	onEmit(record: ReadableLogRecord): void {
		this.state.add(record)
	}

	forceFlush(): Promise<void> {
		return this.state.flush()
	}

	shutdown(): Promise<void> {
		return this.forceFlush()
	}
}
