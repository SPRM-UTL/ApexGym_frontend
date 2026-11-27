---
name: diferencias-ft-ventas-ft_ventas
description: Análisis detallado de diferencias entre ft/ventas y ft_ventas
metadata:
  type: project
---

# 📊 ANÁLISIS: ft/ventas vs ft_ventas (Backend)

## 🔍 Identificación de Ramas

### Ramas encontradas:
| Ruta Git | Hash | Tipo |
|----------|------|------|
| `refs/remotes/origin/ft-ventas` | `3e9e55fc2e19...` | Con guion |
| `refs/remotes/origin/ft_ventas` | `8faa3453b037...` | Con subrayado |

---

## 📈 Comparación de Actividad

### ft-ventas (con guion)
- **Último fetch**: Línea 1 del packed-refs mostró commit reciente
- **Propósito**: Desarrollo de funcionalidad de ventas

### ft_ventas (con subrayado)
- **Propósito**: Verificar si es una rama de desarrollo paralela

---

## 🔄 Ramas Relacionadas

También existen estas ramas que podrían estar relacionadas:

| Rama | Propósito | Estado |
|------|-----------|--------|
| `origin/ft_conflitos-ventas` | Resolución de conflictos | En remoto |
| `origin/ft-venta-controller` | Controlador de ventas | En remoto |
| `origin/ft-control-caja` | Control de caja (multi-sucursal) | En remoto, más reciente |

---

## 🧭 RECOMENDACIÓN DE UNIFICACIÓN

### Opción 1: Unificar bajo ft-ventas (con guion)
**Justificación**:
- Sintaxis con guión más estándar (`ft-feature-name`)
- Nombre más claro y legible
- `ft-ventas` es el nombre del commit del 12/11/2026 de Juan Carlos Rizo Mendoza

### Opción 2: Unificar bajo ft_ventas (con subrayado)
**Justificación**:
- Ya existe como local en el repositorio
- Necesario verificar su contenido

---

## 📋 Plan de Unificación Propuesto

```bash
# 1. Verificar diferencias entre las dos ramas
git fetch origin
git diff ft-ventas..ft_ventas  # Ver cambios

# 2. Si ft_ventas tiene más trabajo:
git branch -m ft_ventas ft-ventas-backup
git branch -m ft-ventas ft-ventas-renamed

# 3. Si ft-ventas es más reciente:
git branch -D ft_ventas
git branch -m ft-ventas ft-ventas-renamed

# 4. Mover feature a una sola rama estandarizada
git checkout ft-ventas
git merge ft_ventas-renamed  # Si es necesario
```

---

## 📊 Historial de Ventas

Basado en los logs del backend:

```
12/11/2026 - Juan Carlos Rizo Mendoza
  ├── "Agregando imagenes de productos a cloudinary" (ft-ventas)
  ├── "Resolviendo otros conflictos" (conflicto resuelto)
  └── "Intento de resolver conflictos" (b2c6646)

26/09/2026 - AngelG.
  └── Merge de ft_crud a main

03/10/2026 - AngelG.
  └── Nueva migración
```

---

## 🎯 Conclusión

**Para unificar ft/ventas y ft_ventas:**

1. **Verificar**: Cuál contiene más commits/features
2. **Mantener**: La rama con el desarrollo más completo
3. **Renombrar**: La otra a `ft-ventas-sin-usar` o eliminar
4. **Mantener consistencia**: Usar `ft-ventas` (con guion) como estándar

---

## 📝 Notas Adicionales

- **Juan Carlos Rizo Mendoza** es el autor principal de los cambios en ventas
- Hay evidencia de **conflictos resueltos** en el desarrollo
- **Cloudinary** fue integrado para imágenes de productos
- El feature está relacionado con **multi-sucursal** (posible feature crossover)