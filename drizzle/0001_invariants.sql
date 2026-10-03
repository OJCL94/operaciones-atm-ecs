-- Enforce aggregate invariants inside the same SQLite write transaction.
CREATE TRIGGER tickets_resolve_guard BEFORE UPDATE OF status ON tickets
WHEN NEW.status IN ('resuelto','cerrado') AND EXISTS(SELECT 1 FROM activities WHERE ticket_id=NEW.id AND status NOT IN ('completada','cancelada'))
BEGIN SELECT RAISE(ABORT,'regla: Hay actividades pendientes para este ticket.'); END;
--> statement-breakpoint
CREATE TRIGGER activities_ticket_insert_guard BEFORE INSERT ON activities
WHEN NEW.ticket_id IS NOT NULL AND EXISTS(SELECT 1 FROM tickets WHERE id=NEW.ticket_id AND (status IN ('resuelto','cerrado') OR demo!=NEW.demo OR asset_id!=NEW.asset_id))
BEGIN SELECT RAISE(ABORT,'regla: El ticket ya fue resuelto o no corresponde al activo y entorno.'); END;
--> statement-breakpoint
CREATE TRIGGER activities_ticket_update_guard BEFORE UPDATE OF ticket_id,asset_id,status ON activities
WHEN NEW.ticket_id IS NOT NULL AND NEW.status NOT IN ('completada','cancelada') AND EXISTS(SELECT 1 FROM tickets WHERE id=NEW.ticket_id AND (status IN ('resuelto','cerrado') OR demo!=NEW.demo OR asset_id!=NEW.asset_id))
BEGIN SELECT RAISE(ABORT,'regla: El ticket ya fue resuelto o no corresponde al activo y entorno.'); END;
--> statement-breakpoint
CREATE TRIGGER resource_requirement_guard BEFORE INSERT ON resource_requirements
WHEN EXISTS(SELECT 1 FROM activities WHERE id=NEW.activity_id AND (status NOT IN ('pendiente','planificada') OR demo!=NEW.demo))
BEGIN SELECT RAISE(ABORT,'regla: Los recursos deben definirse antes de iniciar.'); END;
--> statement-breakpoint
CREATE TRIGGER activities_start_guard BEFORE UPDATE OF status ON activities
WHEN NEW.status='en_curso' AND EXISTS(SELECT 1 FROM resource_requirements r WHERE r.activity_id=NEW.id AND COALESCE((SELECT SUM(quantity) FROM resource_allocations WHERE requirement_id=r.id),0)<r.quantity)
BEGIN SELECT RAISE(ABORT,'regla: Faltan recursos para iniciar la actividad.'); END;
--> statement-breakpoint
CREATE TRIGGER allocation_guard BEFORE INSERT ON resource_allocations
WHEN EXISTS(SELECT 1 FROM resource_requirements r JOIN activities a ON a.id=r.activity_id WHERE r.id=NEW.requirement_id AND (a.status NOT IN ('pendiente','planificada') OR NEW.quantity+COALESCE((SELECT SUM(quantity) FROM resource_allocations WHERE requirement_id=r.id),0)>r.quantity))
BEGIN SELECT RAISE(ABORT,'regla: La actividad ya comenzó o la cantidad supera el requisito.'); END;
--> statement-breakpoint
CREATE TRIGGER study_period_overlap_guard BEFORE INSERT ON study_periods
WHEN EXISTS(SELECT 1 FROM study_periods WHERE demo=NEW.demo AND start_at<=NEW.end_at AND end_at>=NEW.start_at)
BEGIN SELECT RAISE(ABORT,'regla: Los períodos de estudio no pueden solaparse.'); END;
--> statement-breakpoint
CREATE TRIGGER study_period_overlap_update_guard BEFORE UPDATE OF start_at,end_at ON study_periods
WHEN EXISTS(SELECT 1 FROM study_periods WHERE demo=NEW.demo AND id!=NEW.id AND start_at<=NEW.end_at AND end_at>=NEW.start_at)
BEGIN SELECT RAISE(ABORT,'regla: Los períodos de estudio no pueden solaparse.'); END;
--> statement-breakpoint
CREATE TRIGGER events_immutable_update BEFORE UPDATE ON events
BEGIN SELECT RAISE(ABORT,'regla: El historial de auditoría es inmutable.'); END;
--> statement-breakpoint
CREATE TRIGGER events_immutable_delete BEFORE DELETE ON events
BEGIN SELECT RAISE(ABORT,'regla: El historial de auditoría es inmutable.'); END;
