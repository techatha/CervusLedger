export namespace models {
	
	export class Customer {
	    id: number;
	    prefix: string;
	    firstname: string;
	    lastname: string;
	    phone: string;
	    id_card: string;
	    address_no: string;
	    address_line: string;
	    moo: string;
	    road: string;
	    tambon: string;
	    amphoe: string;
	    province: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Customer(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.prefix = source["prefix"];
	        this.firstname = source["firstname"];
	        this.lastname = source["lastname"];
	        this.phone = source["phone"];
	        this.id_card = source["id_card"];
	        this.address_no = source["address_no"];
	        this.address_line = source["address_line"];
	        this.moo = source["moo"];
	        this.road = source["road"];
	        this.tambon = source["tambon"];
	        this.amphoe = source["amphoe"];
	        this.province = source["province"];
	        this.created_at = source["created_at"];
	    }
	}
	export class IncomeExpense {
	    id: number;
	    type: string;
	    category: string;
	    amount: number;
	    notes: string;
	    source: string;
	    date: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new IncomeExpense(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.category = source["category"];
	        this.amount = source["amount"];
	        this.notes = source["notes"];
	        this.source = source["source"];
	        this.date = source["date"];
	        this.created_at = source["created_at"];
	    }
	}
	export class PawnRecord {
	    id: number;
	    ticket_number: number;
	    customer_id: number;
	    customer_name?: string;
	    item_type: string;
	    weight_grams: number;
	    description: string;
	    pawned_date: string;
	    initial_principal: number;
	    current_principal: number;
	    monthly_interest_rate: number;
	    interest_amount: number;
	    status: string;
	    ticket_status: string;
	    created_at: string;
	    last_paid_month?: number;
	    last_paid_year?: number;
	
	    static createFrom(source: any = {}) {
	        return new PawnRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.ticket_number = source["ticket_number"];
	        this.customer_id = source["customer_id"];
	        this.customer_name = source["customer_name"];
	        this.item_type = source["item_type"];
	        this.weight_grams = source["weight_grams"];
	        this.description = source["description"];
	        this.pawned_date = source["pawned_date"];
	        this.initial_principal = source["initial_principal"];
	        this.current_principal = source["current_principal"];
	        this.monthly_interest_rate = source["monthly_interest_rate"];
	        this.interest_amount = source["interest_amount"];
	        this.status = source["status"];
	        this.ticket_status = source["ticket_status"];
	        this.created_at = source["created_at"];
	        this.last_paid_month = source["last_paid_month"];
	        this.last_paid_year = source["last_paid_year"];
	    }
	}
	export class GoldPrice {
	    id: number;
	    date: string;
	    update_time: string;
	    buy_price_per_baht: number;
	    sell_price_per_baht: number;
	    om_buy_price: number;
	    om_sell_price: number;
	
	    static createFrom(source: any = {}) {
	        return new GoldPrice(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.date = source["date"];
	        this.update_time = source["update_time"];
	        this.buy_price_per_baht = source["buy_price_per_baht"];
	        this.sell_price_per_baht = source["sell_price_per_baht"];
	        this.om_buy_price = source["om_buy_price"];
	        this.om_sell_price = source["om_sell_price"];
	    }
	}
	export class DashboardStats {
	    today_price: GoldPrice;
	    active_pawn_count: number;
	    active_pawn_principal: number;
	    paid_this_month: number;
	    unpaid_this_month: number;
	    today_income: number;
	    today_expense: number;
	    today_new_pawns: number;
	    month_interest_collected: number;
	    recent_pawns: PawnRecord[];
	    recent_activity: IncomeExpense[];
	
	    static createFrom(source: any = {}) {
	        return new DashboardStats(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.today_price = this.convertValues(source["today_price"], GoldPrice);
	        this.active_pawn_count = source["active_pawn_count"];
	        this.active_pawn_principal = source["active_pawn_principal"];
	        this.paid_this_month = source["paid_this_month"];
	        this.unpaid_this_month = source["unpaid_this_month"];
	        this.today_income = source["today_income"];
	        this.today_expense = source["today_expense"];
	        this.today_new_pawns = source["today_new_pawns"];
	        this.month_interest_collected = source["month_interest_collected"];
	        this.recent_pawns = this.convertValues(source["recent_pawns"], PawnRecord);
	        this.recent_activity = this.convertValues(source["recent_activity"], IncomeExpense);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class GoldItem {
	    id: number;
	    type: string;
	    subtype: string;
	    purity: string;
	    weight_grams: number;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new GoldItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.subtype = source["subtype"];
	        this.purity = source["purity"];
	        this.weight_grams = source["weight_grams"];
	        this.created_at = source["created_at"];
	    }
	}
	export class GoldItemInput {
	    id: number;
	    type: string;
	    subtype: string;
	    purity: string;
	    weight_grams: number;
	
	    static createFrom(source: any = {}) {
	        return new GoldItemInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.subtype = source["subtype"];
	        this.purity = source["purity"];
	        this.weight_grams = source["weight_grams"];
	    }
	}
	
	export class GoldStockLog {
	    id: number;
	    gold_item_id: number;
	    type: string;
	    subtype: string;
	    amount: number;
	    log_date: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new GoldStockLog(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.gold_item_id = source["gold_item_id"];
	        this.type = source["type"];
	        this.subtype = source["subtype"];
	        this.amount = source["amount"];
	        this.log_date = source["log_date"];
	        this.created_at = source["created_at"];
	    }
	}
	export class GoldStockLogInput {
	    gold_item_id: number;
	    amount: number;
	    log_date: string;
	
	    static createFrom(source: any = {}) {
	        return new GoldStockLogInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.gold_item_id = source["gold_item_id"];
	        this.amount = source["amount"];
	        this.log_date = source["log_date"];
	    }
	}
	
	export class IncomeExpenseFilter {
	    type: string;
	    source: string;
	    start_date: string;
	    end_date: string;
	
	    static createFrom(source: any = {}) {
	        return new IncomeExpenseFilter(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.source = source["source"];
	        this.start_date = source["start_date"];
	        this.end_date = source["end_date"];
	    }
	}
	export class IncomeExpenseInput {
	    type: string;
	    category: string;
	    amount: number;
	    notes: string;
	    date: string;
	
	    static createFrom(source: any = {}) {
	        return new IncomeExpenseInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.category = source["category"];
	        this.amount = source["amount"];
	        this.notes = source["notes"];
	        this.date = source["date"];
	    }
	}
	export class IncomeExpenseSummary {
	    total_income: number;
	    total_expense: number;
	    net: number;
	    start_date: string;
	    end_date: string;
	
	    static createFrom(source: any = {}) {
	        return new IncomeExpenseSummary(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.total_income = source["total_income"];
	        this.total_expense = source["total_expense"];
	        this.net = source["net"];
	        this.start_date = source["start_date"];
	        this.end_date = source["end_date"];
	    }
	}
	export class PawnInput {
	    customer_id: number;
	    item_type: string;
	    weight_grams: number;
	    description: string;
	    pawned_date: string;
	    initial_principal: number;
	    monthly_interest_rate: number;
	    interest_amount: number;
	
	    static createFrom(source: any = {}) {
	        return new PawnInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.customer_id = source["customer_id"];
	        this.item_type = source["item_type"];
	        this.weight_grams = source["weight_grams"];
	        this.description = source["description"];
	        this.pawned_date = source["pawned_date"];
	        this.initial_principal = source["initial_principal"];
	        this.monthly_interest_rate = source["monthly_interest_rate"];
	        this.interest_amount = source["interest_amount"];
	    }
	}
	export class PawnPayment {
	    id: number;
	    pawn_record_id: number;
	    month: number;
	    year: number;
	    paid_date: string;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new PawnPayment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.pawn_record_id = source["pawn_record_id"];
	        this.month = source["month"];
	        this.year = source["year"];
	        this.paid_date = source["paid_date"];
	        this.notes = source["notes"];
	    }
	}
	export class PawnPaymentInput {
	    pawn_record_id: number;
	    month: number;
	    year: number;
	    paid_date: string;
	    notes: string;
	    interest_amount: number;
	    customer_name: string;
	    ticket_number: number;
	
	    static createFrom(source: any = {}) {
	        return new PawnPaymentInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pawn_record_id = source["pawn_record_id"];
	        this.month = source["month"];
	        this.year = source["year"];
	        this.paid_date = source["paid_date"];
	        this.notes = source["notes"];
	        this.interest_amount = source["interest_amount"];
	        this.customer_name = source["customer_name"];
	        this.ticket_number = source["ticket_number"];
	    }
	}
	
	export class PawnSettings {
	    LowRate: number;
	    HighRate: number;
	    Threshold: number;
	    MinInterest: number;
	    LastTicket: number;
	
	    static createFrom(source: any = {}) {
	        return new PawnSettings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.LowRate = source["LowRate"];
	        this.HighRate = source["HighRate"];
	        this.Threshold = source["Threshold"];
	        this.MinInterest = source["MinInterest"];
	        this.LastTicket = source["LastTicket"];
	    }
	}
	export class PrincipalChange {
	    id: number;
	    pawn_record_id: number;
	    date: string;
	    change_type: string;
	    amount: number;
	    new_principal: number;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new PrincipalChange(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.pawn_record_id = source["pawn_record_id"];
	        this.date = source["date"];
	        this.change_type = source["change_type"];
	        this.amount = source["amount"];
	        this.new_principal = source["new_principal"];
	        this.notes = source["notes"];
	    }
	}
	export class PrincipalChangeInput {
	    pawn_record_id: number;
	    date: string;
	    change_type: string;
	    amount: number;
	    new_principal: number;
	    new_interest_rate: number;
	    new_interest_amount: number;
	    notes: string;
	
	    static createFrom(source: any = {}) {
	        return new PrincipalChangeInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.pawn_record_id = source["pawn_record_id"];
	        this.date = source["date"];
	        this.change_type = source["change_type"];
	        this.amount = source["amount"];
	        this.new_principal = source["new_principal"];
	        this.new_interest_rate = source["new_interest_rate"];
	        this.new_interest_amount = source["new_interest_amount"];
	        this.notes = source["notes"];
	    }
	}
	export class PurchasedGold {
	    id: number;
	    customer_id: number;
	    customer_name: string;
	    type: string;
	    subtype: string;
	    weight_baht: number;
	    weight_grams: number;
	    total_amount: number;
	    notes: string;
	    date: string;
	    is_inventory: number;
	    still_exists: number;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new PurchasedGold(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.customer_id = source["customer_id"];
	        this.customer_name = source["customer_name"];
	        this.type = source["type"];
	        this.subtype = source["subtype"];
	        this.weight_baht = source["weight_baht"];
	        this.weight_grams = source["weight_grams"];
	        this.total_amount = source["total_amount"];
	        this.notes = source["notes"];
	        this.date = source["date"];
	        this.is_inventory = source["is_inventory"];
	        this.still_exists = source["still_exists"];
	        this.created_at = source["created_at"];
	    }
	}
	export class Sale {
	    id: number;
	    customer_id: number;
	    customer_name: string;
	    gold_item_id: number;
	    gold_item_type: string;
	    type: string;
	    weight_baht: number;
	    gold_price_id: number;
	    price_per_baht: number;
	    total_amount: number;
	    notes: string;
	    date: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new Sale(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.customer_id = source["customer_id"];
	        this.customer_name = source["customer_name"];
	        this.gold_item_id = source["gold_item_id"];
	        this.gold_item_type = source["gold_item_type"];
	        this.type = source["type"];
	        this.weight_baht = source["weight_baht"];
	        this.gold_price_id = source["gold_price_id"];
	        this.price_per_baht = source["price_per_baht"];
	        this.total_amount = source["total_amount"];
	        this.notes = source["notes"];
	        this.date = source["date"];
	        this.created_at = source["created_at"];
	    }
	}
	export class SaleInput {
	    type: string;
	    customer_id: number;
	    gold_item_id: number;
	    weight_baht: number;
	    weight_grams: number;
	    gold_price_id: number;
	    price_per_baht: number;
	    total_amount: number;
	    notes: string;
	    date: string;
	    item_type: string;
	    item_subtype: string;
	    is_inventory: number;
	
	    static createFrom(source: any = {}) {
	        return new SaleInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.type = source["type"];
	        this.customer_id = source["customer_id"];
	        this.gold_item_id = source["gold_item_id"];
	        this.weight_baht = source["weight_baht"];
	        this.weight_grams = source["weight_grams"];
	        this.gold_price_id = source["gold_price_id"];
	        this.price_per_baht = source["price_per_baht"];
	        this.total_amount = source["total_amount"];
	        this.notes = source["notes"];
	        this.date = source["date"];
	        this.item_type = source["item_type"];
	        this.item_subtype = source["item_subtype"];
	        this.is_inventory = source["is_inventory"];
	    }
	}

}

export namespace sql {
	
	export class DB {
	
	
	    static createFrom(source: any = {}) {
	        return new DB(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

