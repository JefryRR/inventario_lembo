
CREATE DEFINER = CURRENT_USER TRIGGER `defaultdb`.`alimento_produccion_BEFORE_UPDATE`
BEFORE UPDATE ON `alimento_produccion`
FOR EACH ROW
BEGIN
    DECLARE stock_actual DECIMAL(10,2);
    DECLARE tipo_insumo VARCHAR(45);
    DECLARE conv_insumo DECIMAL(10,3);
    DECLARE tipo_insumo_old VARCHAR(45);
    DECLARE conv_insumo_old DECIMAL(10,3);
    DECLARE tipo_new VARCHAR(45);
    DECLARE conv_new DECIMAL(10,3);
    DECLARE tipo_old VARCHAR(45);
    DECLARE conv_old DECIMAL(10,3);
    DECLARE consumo_new DECIMAL(10,6);
    DECLARE consumo_old DECIMAL(10,6);
    DECLARE delta DECIMAL(10,6);

    SELECT ii.cantidad, um.tipo_unidad, um.conversion
      INTO stock_actual, tipo_insumo, conv_insumo
      FROM inv_insumos ii
      INNER JOIN unidades_medida um ON um.id_unidad = ii.unid_medida_id
      WHERE ii.id_insumo = NEW.insumo_id;

    SELECT ii.cantidad, um.tipo_unidad, um.conversion
      INTO tipo_insumo_old, conv_insumo_old
      FROM inv_insumos ii
      INNER JOIN unidades_medida um ON um.id_unidad = ii.unid_medida_id
      WHERE ii.id_insumo = OLD.insumo_id;

    SELECT tipo_unidad, conversion
      INTO tipo_new, conv_new
      FROM unidades_medida
      WHERE id_unidad = NEW.unid_medida_id;

    SELECT tipo_unidad, conversion
      INTO tipo_old, conv_old
      FROM unidades_medida
      WHERE id_unidad = OLD.unid_medida_id;

    IF stock_actual IS NULL OR tipo_insumo_old IS NULL OR tipo_new IS NULL OR tipo_old IS NULL THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: No se encontró el insumo o la unidad en el inventario';
    END IF;

    IF tipo_insumo != tipo_new OR tipo_insumo_old != tipo_old THEN
        SIGNAL SQLSTATE '45000'
        SET MESSAGE_TEXT = 'Error: La unidad del alimento y la del inventario son incompatibles';
    END IF;

    SET consumo_new = (NEW.cantidad * conv_new) / conv_insumo;
    SET consumo_old = (OLD.cantidad * conv_old) / conv_insumo_old;

    IF NEW.insumo_id = OLD.insumo_id THEN
        SET delta = consumo_new - consumo_old;

        IF delta > 0 AND stock_actual < delta THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: No hay suficiente stock para actualizar esta producción';
        END IF;

        UPDATE inv_insumos
           SET cantidad = cantidad - delta
         WHERE id_insumo = NEW.insumo_id;
    ELSE
        UPDATE inv_insumos
           SET cantidad = cantidad + consumo_old
         WHERE id_insumo = OLD.insumo_id;

        IF stock_actual < consumo_new THEN
            SIGNAL SQLSTATE '45000'
            SET MESSAGE_TEXT = 'Error: No hay suficiente stock para actualizar esta producción';
        END IF;

        UPDATE inv_insumos
           SET cantidad = cantidad - consumo_new
         WHERE id_insumo = NEW.insumo_id;
    END IF;

    SET NEW.cant_convertida = NEW.cantidad * conv_new;
END