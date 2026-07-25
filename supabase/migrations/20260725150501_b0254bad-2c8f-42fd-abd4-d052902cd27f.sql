-- DS-T2d cron dedup: keep 'delivery-sentinel-sweep' (DS-T2b/T2c lineage), drop 'delivery-sentinel-minute'.
SELECT cron.unschedule('delivery-sentinel-minute');