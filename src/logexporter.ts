import { ExportResult, ExportResultCode } from '@opentelemetry/core'
import { OTLPExporterError } from '@opentelemetry/otlp-exporter-base'
import { JsonLogsSerializer } from '@opentelemetry/otlp-transformer'
import { LogRecordExporter, ReadableLogRecord } from '@opentelemetry/sdk-logs'
import { unwrap } from './wrap.js'

//@ts-ignore
import * as versions from '../versions.json'

export interface OTLPLogExporterConfig {
	url: string
	headers?: Record<string, string>
}

const defaultHeaders: Record<string, string> = {
	accept: 'application/json',
	'content-type': 'application/json',
	'user-agent': `Cloudflare Worker @microlabs/otel-cf-workers v${versions['@microlabs/otel-cf-workers']}`,
}

export class OTLPLogExporter implements LogRecordExporter {
	private headers: Record<string, string>
	private url: string
	constructor(config: OTLPLogExporterConfig) {
		this.url = config.url
		this.headers = Object.assign({}, defaultHeaders, config.headers)
	}

	export(items: ReadableLogRecord[], resultCallback: (result: ExportResult) => void): void {
		this._export(items)
			.then(() => {
				resultCallback({ code: ExportResultCode.SUCCESS })
			})
			.catch((error) => {
				resultCallback({ code: ExportResultCode.FAILED, error })
			})
	}

	private _export(items: ReadableLogRecord[]): Promise<void> {
		return new Promise((resolve, reject) => {
			try {
				this.send(items, resolve, reject)
			} catch (e) {
				reject(e)
			}
		})
	}

	send(items: ReadableLogRecord[], onSuccess: () => void, onError: (error: OTLPExporterError) => void): void {
		const decoder = new TextDecoder()
		const exportMessage = JsonLogsSerializer.serialize(items)
		const body = decoder.decode(exportMessage)
		const params: RequestInit = {
			method: 'POST',
			headers: this.headers,
			body,
		}
		unwrap(fetch)(this.url, params)
			.then((response) => {
				if (response.ok) {
					onSuccess()
				} else {
					onError(new OTLPExporterError(`Exporter received a statusCode: ${response.status}`))
				}
			})
			.catch((error) => {
				onError(new OTLPExporterError(`Exception during export: ${error.toString()}`, error.code, error.stack))
			})
	}

	async shutdown(): Promise<void> {}
}
