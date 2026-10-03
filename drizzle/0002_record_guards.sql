CREATE TRIGGER ticket_asset_guard BEFORE INSERT ON tickets
WHEN NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND demo=NEW.demo AND status!='retirado')
BEGIN SELECT RAISE(ABORT,'regla: El activo está retirado o pertenece a otro entorno.'); END;
CREATE TRIGGER activity_asset_guard BEFORE INSERT ON activities
WHEN NOT EXISTS(SELECT 1 FROM assets WHERE id=NEW.asset_id AND demo=NEW.demo AND status!='retirado')
BEGIN SELECT RAISE(ABORT,'regla: El activo está retirado o pertenece a otro entorno.'); END;
CREATE TRIGGER asset_retirement_guard BEFORE UPDATE OF status ON assets
WHEN NEW.status='retirado' AND (EXISTS(SELECT 1 FROM tickets WHERE asset_id=NEW.id AND status NOT IN ('resuelto','cerrado')) OR EXISTS(SELECT 1 FROM activities WHERE asset_id=NEW.id AND status NOT IN ('completada','cancelada')))
BEGIN SELECT RAISE(ABORT,'regla: El activo tiene tickets o actividades pendientes.'); END;
CREATE TRIGGER measurement_no_update BEFORE UPDATE ON measurements BEGIN SELECT RAISE(ABORT,'regla: Las mediciones son inmutables.'); END;
CREATE TRIGGER measurement_no_delete BEFORE DELETE ON measurements BEGIN SELECT RAISE(ABORT,'regla: Las mediciones son inmutables.'); END;
