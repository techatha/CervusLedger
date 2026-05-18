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
	export class GoldItem {
	    id: number;
	    type: string;
	    weight_baht: number;
	    purity: string;
	    description: string;
	    status: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new GoldItem(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.weight_baht = source["weight_baht"];
	        this.purity = source["purity"];
	        this.description = source["description"];
	        this.status = source["status"];
	        this.created_at = source["created_at"];
	    }
	}
	export class GoldItemInput {
	    id: number;
	    type: string;
	    weight_baht: number;
	    purity: string;
	    description: string;
	    status: string;
	
	    static createFrom(source: any = {}) {
	        return new GoldItemInput(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.type = source["type"];
	        this.weight_baht = source["weight_baht"];
	        this.purity = source["purity"];
	        this.description = source["description"];
	        this.status = source["status"];
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

}

