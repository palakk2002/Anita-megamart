import Product from "../models/product.js";
import StockHistory from "../models/stockHistory.js";
import handleResponse from "../utils/helper.js";
import { emitNotificationEvent } from "../modules/notifications/notification.emitter.js";
import { NOTIFICATION_EVENTS } from "../modules/notifications/notification.constants.js";
import {
    createLowStockAlertCandidate,
    isLowStockAlertsEnabled,
} from "../services/lowStockAlertService.js";

/* ===============================
   ADJUST STOCK MANUALLY
================================ */
export const adjustStock = async (req, res) => {
    try {
        const { productId, type, quantity, note } = req.body;
        const sellerId = req.user.id;

        const product = await Product.findOne({ _id: productId, sellerId });
        if (!product) {
            return handleResponse(res, 404, "Product not found or unauthorized");
        }

        const inputQty = Number(quantity);
        const previousStock = Number(product.stock || 0);

        let finalStock;
        let diffQty;

        if (type === 'Set Stock' || type === 'Set') {
            finalStock = inputQty;
            diffQty = finalStock - previousStock;
        } else if (type === 'Restock') {
            finalStock = previousStock + inputQty;
            diffQty = inputQty;
        } else {
            finalStock = previousStock - inputQty;
            diffQty = -inputQty;
        }

        if (finalStock < 0) {
            return handleResponse(res, 400, "Stock cannot be negative");
        }

        // 1. Update Product Master Stock and Sync Variants
        product.stock = finalStock;
        if (Array.isArray(product.variants) && product.variants.length > 0) {
            product.variants.forEach((v) => {
                v.stock = finalStock;
            });
            product.markModified("variants");
        }
        await product.save();

        // 2. Create History Entry
        const historyEntry = new StockHistory({
            product: productId,
            seller: sellerId,
            type: type || 'Correction',
            quantity: diffQty,
            note: note || `Manual ${type || 'Stock'} adjustment`
        });

        await historyEntry.save();

        // 3. Emit Low Stock Alert if stock dropped or set to low stock threshold
        if (finalStock <= (product.lowStockAlert || 5) && (await isLowStockAlertsEnabled())) {
            const lowStockAlert = createLowStockAlertCandidate({
                product,
                previousStock,
                currentStock: finalStock,
            });
            if (lowStockAlert) {
                emitNotificationEvent(NOTIFICATION_EVENTS.LOW_STOCK_ALERT, lowStockAlert);
            }
        }

        return handleResponse(res, 200, "Stock adjusted successfully", {
            newStock: product.stock,
            historyEntry
        });

    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};

/* ===============================
   GET STOCK HISTORY LOG
================================ */
export const getStockHistory = async (req, res) => {
    try {
        const sellerId = req.user.id;

        const history = await StockHistory.find({ seller: sellerId })
            .sort({ createdAt: -1 })
            .populate("product", "name sku mainImage");

        return handleResponse(res, 200, "Stock history fetched", history.map(item => ({
            id: item._id,
            productName: item.product?.name || "Deleted Product",
            sku: item.product?.sku || "N/A",
            type: item.type,
            quantity: item.quantity > 0 ? `+${item.quantity}` : `${item.quantity}`,
            date: item.createdAt.toISOString().split('T')[0],
            time: item.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            note: item.note
        })));

    } catch (error) {
        return handleResponse(res, 500, error.message);
    }
};
