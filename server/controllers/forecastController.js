const forecastService = require('../services/forecastService');
const pdfService = require('../services/pdfService');

/**
 * getForecasts
 * GET /api/procurement/forecast
 */
exports.getForecasts = async (req, res) => {
  try {
    const list = await forecastService.calculateForecasts();
    res.json(list);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getProductForecast
 * GET /api/procurement/forecast/:productId
 */
exports.getProductForecast = async (req, res) => {
  try {
    const data = await forecastService.getProductForecast(req.params.productId);
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

/**
 * getForecastReportPDF
 * GET /api/procurement/forecast/report/pdf
 */
exports.getForecastReportPDF = async (req, res) => {
  try {
    const list = await forecastService.calculateForecasts();
    const pdfBuffer = await pdfService.generateForecastReportPDF(list);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=Inventory_Forecast_Report.pdf');
    res.send(pdfBuffer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
