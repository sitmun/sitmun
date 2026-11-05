export function mapConfigurationErrorKey(status: number | undefined): string {
  return status === 403
    ? 'map.error.access.denied'
    : 'map.error.config.fetch.failed';
}
