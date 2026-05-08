export namespace db {
	
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
	export class PawnRecord {
	    id: number;
	    ticket_number: number;
	    customer_id: number;
	    item_type: string;
	    weight_grams: number;
	    description: string;
	    pawned_date: string;
	    principal_amount: number;
	    monthly_interest_rate: number;
	    interest_amount: number;
	    ticket_status: string;
	    status: string;
	    created_at: string;
	
	    static createFrom(source: any = {}) {
	        return new PawnRecord(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.ticket_number = source["ticket_number"];
	        this.customer_id = source["customer_id"];
	        this.item_type = source["item_type"];
	        this.weight_grams = source["weight_grams"];
	        this.description = source["description"];
	        this.pawned_date = source["pawned_date"];
	        this.principal_amount = source["principal_amount"];
	        this.monthly_interest_rate = source["monthly_interest_rate"];
	        this.interest_amount = source["interest_amount"];
	        this.ticket_status = source["ticket_status"];
	        this.status = source["status"];
	        this.created_at = source["created_at"];
	    }
	}

}

