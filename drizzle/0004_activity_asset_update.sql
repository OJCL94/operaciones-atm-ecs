CREATE TRIGGER activity_asset_update_guard BEFORE UPDATE OF asset_id ON activities
WHEN NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND demo=NEW.demo AND status!='retirado')
BEGIN SELECT RAISE(ABORT,'regla: El activo está retirado o pertenece a otro entorno.'); END;
