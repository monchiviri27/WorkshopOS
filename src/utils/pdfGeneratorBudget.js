import { supabase } from '../lib/supabaseClient';

// Datos de la empresa (por defecto)
let EMPRESA = {
  nombre: 'LAM-RELOJEROS S.L',
  cif: 'B-88615489',
  telefono: '672373275',
  email: 'tallersanchinarro@rubiorelojeros.com',
  direccion: 'C/ Margarita de Parma, 1',
  ciudad: '28050 Madrid'
};

let LOGO_URL = '/logo-taller.png';
let IVA_PORCENTAJE = 21;

/**
 * Carga la configuración de la empresa desde Supabase
 */
async function cargarConfiguracion() {
  try {
    const { data: config, error } = await supabase
      .from('configuracion')
      .select('*')
      .single();

    if (error) throw error;

    if (config) {
      if (config.empresa) {
        EMPRESA = { ...EMPRESA, ...config.empresa };
      }
      if (config.impuestos?.iva) {
        IVA_PORCENTAJE = config.impuestos.iva;
      }
      if (config.logo_url) {
        LOGO_URL = config.logo_url;
      }
    }
  } catch (error) {
    console.log('Usando configuración por defecto');
  }
}

/**
 * Genera un PDF profesional del presupuesto (HTML + print)
 */
export const generateBudgetPDF = async (order, client, descuento = 0, descuentoTipo = 'porcentaje', notas = '') => {
  await cargarConfiguracion();

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString();
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calcular totales
  const trabajosList = order.trabajos || [];
  const trabajosTotal = trabajosList.reduce((sum, t) => sum + (t.total || t.tarifa_aplicada * (t.cantidad || 1) || 0), 0);
  const fallosTotal = (order.fallos || []).reduce((sum, f) => sum + (f.total || 0), 0);
  const subtotalConIVA = trabajosTotal + fallosTotal;
  
  let descuentoAplicado = 0;
  if (descuento > 0) {
    if (descuentoTipo === 'porcentaje') {
      descuentoAplicado = subtotalConIVA * (descuento / 100);
    } else {
      descuentoAplicado = Math.min(descuento, subtotalConIVA);
    }
  }
  
  const totalConIVA = subtotalConIVA - descuentoAplicado;
  const baseImponible = totalConIVA / (1 + IVA_PORCENTAJE / 100);
  const iva = totalConIVA - baseImponible;

  const fechaEmision = formatDate(new Date());
  const fechaValidez = formatDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  // Separar trabajos obligatorios y opcionales
  const trabajosObligatorios = trabajosList.filter(t => !t.opcional);
  const trabajosOpcionales = trabajosList.filter(t => t.opcional === true);
  
  // Calcular totales separados
  const totalObligatorio = trabajosObligatorios.reduce((sum, t) => sum + (t.total || 0), 0);
  const totalOpcional = trabajosOpcionales.reduce((sum, t) => sum + (t.total || 0), 0);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Presupuesto - ${order.order_number}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Helvetica', Arial, sans-serif;
          background: white;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #333;
        }
        .logo-area img {
          max-height: 120px;
          max-width: 240px;
        }
        .title-area {
          text-align: right;
        }
        .title-area h1 {
          font-size: 28px;
          color: #333;
          margin-bottom: 10px;
        }
        .doc-number {
          font-size: 12px;
          color: #666;
        }
        .data-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30px;
          margin-bottom: 30px;
        }
        .data-box {
          border: 1px solid #eee;
          padding: 15px;
          border-radius: 8px;
          background: #fafafa;
        }
        .data-box h3 {
          font-size: 14px;
          color: #333;
          margin-bottom: 12px;
          border-bottom: 1px solid #eee;
          padding-bottom: 5px;
        }
        .data-row {
          font-size: 12px;
          margin: 8px 0;
        }
        .data-label {
          font-weight: bold;
          color: #555;
          display: inline-block;
          width: 80px;
        }
        .concepto {
          margin-bottom: 25px;
        }
        .concepto h3 {
          font-size: 14px;
          color: #333;
          margin-bottom: 8px;
        }
        .concepto-text {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 5px;
          font-size: 13px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
        }
        th {
          background: #f0f0f0;
          padding: 10px;
          text-align: left;
          font-size: 12px;
          font-weight: bold;
          border-bottom: 2px solid #ddd;
        }
        td {
          padding: 8px 10px;
          font-size: 11px;
          border-bottom: 1px solid #eee;
        }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .opcional-row {
          background-color: #fffbeb;
        }
        .badge-opcional {
          display: inline-block;
          background-color: #fef3c7;
          color: #b45309;
          font-size: 9px;
          padding: 2px 6px;
          border-radius: 12px;
          margin-left: 8px;
          font-weight: normal;
        }
        .totales {
          margin-top: 20px;
          text-align: right;
        }
        .totales-box {
          display: inline-block;
          background: #fafafa;
          padding: 15px 25px;
          border-radius: 8px;
          border: 1px solid #333;
          min-width: 250px;
        }
        .total-row {
          display: flex;
          justify-content: space-between;
          margin: 8px 0;
          font-size: 12px;
        }
        .total-row strong {
          font-size: 16px;
          color: #333;
        }
        .separator {
          border-top: 1px solid #ddd;
          margin: 10px 0;
        }
        .notas {
          margin: 30px 0;
          background: #fff8e8;
          padding: 12px;
          border-radius: 5px;
          font-size: 11px;
          border-left: 3px solid #333;
        }
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 12px;
          color: #999;
        }
        .opcional-nota {
          background: #fffbeb;
          border: 1px solid #fde68a;
          padding: 10px;
          border-radius: 5px;
          margin-top: 15px;
          font-size: 11px;
          color: #92400e;
        }
        @media print {
          body { padding: 0; }
          .opcional-row {
            background-color: #fffbeb !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo-area">
            <img src="${LOGO_URL}" alt="Logo" onerror="this.style.display='none'">
          </div>
          <div class="title-area">
            <h1>PRESUPUESTO</h1>
            <div class="doc-number">Nº ${order.order_number || order.id.slice(-8)}</div>
            <div class="doc-number">Fecha: ${fechaEmision}</div>
            <div class="doc-number">Válido hasta: ${fechaValidez}</div>
          </div>
        </div>

        <div class="data-grid">
          <div class="data-box">
            <h3>TALLER</h3>
            <div class="data-row"><span class="data-label">Nombre:</span> ${EMPRESA.nombre}</div>
            <div class="data-row"><span class="data-label">Dirección:</span> ${EMPRESA.direccion}</div>
            <div class="data-row"><span class="data-label">Ciudad:</span> ${EMPRESA.ciudad}</div>
            <div class="data-row"><span class="data-label">CIF:</span> ${EMPRESA.cif}</div>
            <div class="data-row"><span class="data-label">Teléfono:</span> ${EMPRESA.telefono}</div>
            <div class="data-row"><span class="data-label">Email:</span> ${EMPRESA.email}</div>
          </div>
          <div class="data-box">
            <h3>CLIENTE</h3>
            <div class="data-row"><span class="data-label">Nombre:</span> ${client.name}</div>
            <div class="data-row"><span class="data-label">Teléfono:</span> ${client.phone}</div>
            ${client.email ? `<div class="data-row"><span class="data-label">Email:</span> ${client.email}</div>` : ''}
            ${client.address ? `<div class="data-row"><span class="data-label">Dirección:</span> ${client.address}</div>` : ''}
            ${client.nif ? `<div class="data-row"><span class="data-label">NIF:</span> ${client.nif}</div>` : ''}
          </div>
        </div>

        <div class="concepto">
          <h3>JOYA A REPARAR</h3>
          <div class="concepto-text">
            <strong>Tipo:</strong> ${order.item_type || 'No especificado'}<br>
            <strong>Material:</strong> ${order.material || 'No especificado'}<br>
            <strong>Descripción:</strong> ${order.description || 'Sin descripción'}<br>
            ${order.observations ? `<strong>Observaciones:</strong> ${order.observations}` : ''}
          </div>
        </div>

        ${order.fallos?.length > 0 ? `
          <h3>FALLOS DETECTADOS</h3>
          <table>
            <thead>
              <tr><th>Fallo</th><th>Observaciones</th></tr>
            </thead>
            <tbody>
              ${order.fallos.map(f => `
                <tr>
                  <td>${f.nombre}</td>
                  <td>${f.observaciones || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${trabajosObligatorios.length > 0 ? `
          <h3>TRABAJOS OBLIGATORIOS</h3>
          <table>
            <thead>
              <tr><th>Trabajo</th><th class="text-center">Cant.</th><th class="text-right">Precio</th><th class="text-center">Dto.</th><th class="text-right">Importe</th></tr>
            </thead>
            <tbody>
              ${trabajosObligatorios.map(t => `
                <tr>
                  <td>${t.nombre}</td>
                  <td class="text-center">${t.cantidad || 1}</td>
                  <td class="text-right">${(t.tarifa_aplicada || t.tarifa_base || 0).toFixed(2)} €</td>
                  <td class="text-center">${t.descuento ? `${t.descuento}%` : '—'}</td>
                  <td class="text-right">${(t.total || 0).toFixed(2)} €</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        ${trabajosOpcionales.length > 0 ? `
          <h3>TRABAJOS OPCIONALES</h3>
          <p style="font-size: 11px; color: #666; margin-bottom: 10px;">
            💡 Estos trabajos son opcionales. Puedes decidir si incluirlos o no al aceptar el presupuesto.
          </p>
          <table>
            <thead>
              <tr><th>Trabajo</th><th class="text-center">Cant.</th><th class="text-right">Precio</th><th class="text-center">Dto.</th><th class="text-right">Importe</th></tr>
            </thead>
            <tbody>
              ${trabajosOpcionales.map(t => `
                <tr class="opcional-row">
                  <td>${t.nombre} <span class="badge-opcional">Opcional</span></td>
                  <td class="text-center">${t.cantidad || 1}</td>
                  <td class="text-right">${(t.tarifa_aplicada || t.tarifa_base || 0).toFixed(2)} €</td>
                  <td class="text-center">${t.descuento ? `${t.descuento}%` : '—'}</td>
                  <td class="text-right">${(t.total || 0).toFixed(2)} €</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="opcional-nota">
            ⚠️ Los trabajos marcados como <strong>"Opcional"</strong> no están incluidos en el total por defecto.
            Si deseas realizarlos, deberás marcarlos al aceptar el presupuesto.
          </div>
        ` : ''}

        <div class="totales">
          <div class="totales-box">
            <div class="total-row"><span>Subtotal (obligatorios):</span><span>${totalObligatorio.toFixed(2)} €</span></div>
            ${totalOpcional > 0 ? `<div class="total-row"><span>Trabajos opcionales:</span><span>${totalOpcional.toFixed(2)} €</span></div>` : ''}
            ${descuentoAplicado > 0 ? `<div class="total-row"><span>Descuento:</span><span>- ${descuentoAplicado.toFixed(2)} €</span></div>` : ''}
            <div class="separator"></div>
            <div class="total-row"><span>Base imponible:</span><span>${baseImponible.toFixed(2)} €</span></div>
            <div class="total-row"><span>IVA (${IVA_PORCENTAJE}%):</span><span>${iva.toFixed(2)} €</span></div>
            <div class="separator"></div>
            <div class="total-row"><strong>TOTAL (obligatorios):</strong><strong>${totalConIVA.toFixed(2)} €</strong></div>
            ${totalOpcional > 0 ? `<div class="total-row" style="margin-top: 8px; font-size: 11px; color: #666;">* El total de opcionales (${totalOpcional.toFixed(2)} €) se añadirá si los seleccionas</div>` : ''}
          </div>
        </div>

        ${notas || order.budget_notes ? `
          <div class="notas">
            <strong>NOTAS:</strong><br>${notas || order.budget_notes}
          </div>
        ` : ''}

        <div class="footer">
          <p>Este presupuesto tiene una validez de 30 días. Los precios incluyen IVA.</p>
          <p>${EMPRESA.nombre} · ${EMPRESA.telefono} · ${EMPRESA.email}</p>
        </div>
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();
  
  setTimeout(() => {
    printWindow.print();
  }, 500);
};