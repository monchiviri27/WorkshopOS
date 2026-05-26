import { supabase } from '../lib/supabaseClient';

// Datos de la empresa (por defecto)
let EMPRESA = {
  nombre: 'LAM-RELOJEROS S.L',
  cif: 'B-88615489',
  telefono: '672373275',
  email: 'tallersanchinarro@rubiorelojeros.com',
  direccion: 'C/ Margarita de Parma, 1',
  ciudad: '28050 Madrid',
  cuentaBancaria: 'ES00 0000 0000 0000 0000 0000'
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

export const generateFacturaPDF = async (factura, order, client) => {
  await cargarConfiguracion();

  const formatDate = (dateString) => {
    if (!dateString) return new Date().toLocaleDateString('es-ES');
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Calcular totales
  const totalConIVA = factura.total || order?.budget || 0;
  const baseImponible = factura.base_imponible || totalConIVA / (1 + IVA_PORCENTAJE / 100);
  const iva = factura.iva || totalConIVA - baseImponible;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Factura ${factura.numero}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Helvetica', Arial, sans-serif;
          background: white;
          padding: 20px;
          margin-top:30px;
          color: #333;
        }
        .container {
          max-width: 1000px;
          margin: 0 auto;
        }
        
        /* HEADER */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 30px;
          padding-bottom: 20px;
          border-bottom: 2px solid #000000;
        }
        .logo-area img {
          max-height: 120px;
          max-width: 240px;
        }
        .title-area {
          text-align: right;
        }
        .title-area h1 {
          font-size: 30px;
          color: #000000;
          margin-bottom: 10px;
        }
        .invoice-number {
          font-size: 12px;
          color: #666;
          margin: 3px 0;
        }
        
        /* DATOS */
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
          color: #000000;
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
        
        /* CONCEPTO */
        .concepto {
          margin-bottom: 25px;
        }
        .concepto h3 {
          font-size: 14px;
          color: #000000;
          margin-bottom: 8px;
        }
        .concepto-text {
          background: #f5f5f5;
          padding: 12px;
          border-radius: 5px;
          font-size: 13px;
        }
        
        /* TABLA */
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
        
        /* TOTALES */
        .totales {
          margin-top: 20px;
          text-align: right;
        }
        .totales-box {
          display: inline-block;
          background: #fafafa;
          padding: 15px 25px;
          border-radius: 8px;
          border: 1px solid #000000;
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
          color: #000000;
        }
        .separator {
          border-top: 1px solid #ddd;
          margin: 10px 0;
        }
        
        /* NOTAS */
        .notas {
          margin: 30px 0;
          background: #fff8e8;
          padding: 12px;
          border-radius: 5px;
          font-size: 11px;
          border-left: 3px solid #000000;
        }
        
        /* PIE */
        .footer {
          margin-top: 40px;
          padding-top: 20px;
          border-top: 1px solid #eee;
          text-align: center;
          font-size: 11px;
          color: #999;
        }
        
        @media print {
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <!-- HEADER -->
        <div class="header">
          <div class="logo-area">
            <img src="${LOGO_URL}" alt="Logo" onerror="this.style.display='none'">
          </div>
          <div class="title-area">
            <h1>FACTURA</h1>
            <div class="invoice-number">Nº ${factura.numero}</div>
            <div class="invoice-number">Fecha: ${formatDate(factura.fecha)}</div>
            <div class="invoice-number">Vencimiento: ${formatDate(factura.fecha)}</div>
          </div>
        </div>

        <!-- DATOS -->
        <div class="data-grid">
          <div class="data-box">
            <h3>EMPRESA</h3>
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
            ${client.nif ? `<div class="data-row"><span class="data-label">NIF:</span> ${client.nif}</div>` : ''}
            <div class="data-row"><span class="data-label">Teléfono:</span> ${client.phone}</div>
            ${client.email ? `<div class="data-row"><span class="data-label">Email:</span> ${client.email}</div>` : ''}
            ${client.address ? `<div class="data-row"><span class="data-label">Dirección:</span> ${client.address}</div>` : ''}
          </div>
        </div>

        <!-- CONCEPTO -->
        <div class="concepto">
          <h3>CONCEPTO</h3>
          <div class="concepto-text">${factura.concepto}</div>
        </div>

        <!-- TABLA DE TRABAJOS -->
        ${order?.trabajos?.length > 0 ? `
          <h3>DETALLE DE TRABAJOS</h3>
          <table>
            <thead>
              <tr>
                <th>Trabajo</th>
                <th class="text-center">Cant.</th>
                <th class="text-right">Precio</th>
                <th class="text-center">Dto.</th>
                <th class="text-right">Importe</th>
              </tr>
            </thead>
            <tbody>
              ${order.trabajos.map(t => `
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

        <!-- TOTALES -->
        <div class="totales">
          <div class="totales-box">
            <div class="total-row"><span>Base imponible:</span><span>${baseImponible.toFixed(2)} €</span></div>
            <div class="total-row"><span>IVA (${IVA_PORCENTAJE}%):</span><span>${iva.toFixed(2)} €</span></div>
            <div class="separator"></div>
            <div class="total-row"><strong>TOTAL:</strong><strong>${totalConIVA.toFixed(2)} €</strong></div>
          </div>
        </div>

        <!-- NOTAS -->
        ${order?.budget_notes ? `
          <div class="notas">
            <strong>NOTAS:</strong><br>${order.budget_notes}
          </div>
        ` : ''}

        <!-- PIE -->
        <div class="footer">
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