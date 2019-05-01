import {Index,Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, ManyToOne, ManyToMany, JoinColumn, JoinTable, RelationId} from "typeorm";


@Entity("u_ols_wallet",{schema:"meitui"})
export class u_ols_wallet {

    @PrimaryGeneratedColumn({ 
        name:"id"
        })
    id:number;
        

    @Column("int",{ 
        nullable:true,
        name:"u_user_id"
        })
    u_user_id:number | null;
        

    @Column("varchar",{ 
        nullable:true,
        length:100,
        name:"eth_address"
        })
    eth_address:string | null;
        

    @Column("varchar",{ 
        nullable:true,
        length:64,
        name:"salt"
        })
    salt:string | null;
        

    @Column("varchar",{ 
        nullable:true,
        length:100,
        name:"mnemonic"
        })
    mnemonic:string | null;
        

    @Column("double",{ 
        nullable:true,
        precision:10,
        scale:2,
        name:"amount"
        })
    amount:number | null;
        

    @Column("double",{ 
        nullable:true,
        precision:10,
        scale:2,
        name:"lock_amount"
        })
    lock_amount:number | null;
        

    @Column("double",{ 
        nullable:true,
        precision:10,
        scale:2,
        name:"charge_amount"
        })
    charge_amount:number | null;
        

    @Column("double",{ 
        nullable:true,
        precision:10,
        scale:2,
        name:"draw_amount"
        })
    draw_amount:number | null;
        
}
