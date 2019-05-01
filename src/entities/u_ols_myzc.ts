import {Index,Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, ManyToOne, ManyToMany, JoinColumn, JoinTable, RelationId} from "typeorm";


@Entity("u_ols_myzc",{schema:"meitui"})
@Index("userid",["u_user_id",])
@Index("status",["status",])
@Index("coinname",["coinname",])
export class u_ols_myzc {

    @PrimaryGeneratedColumn({ 
        name:"id"
        })
    id:number;
        

    @Column("int",{ 
        nullable:false,
        name:"u_user_id"
        })
    u_user_id:number;
        

    @Column("varchar",{ 
        nullable:false,
        length:200,
        default:"",
        name:"txhash"
        })
    txhash:string;
        

    @Column("varchar",{ 
        nullable:false,
        length:200,
        name:"addr"
        })
    addr:string;
        

    @Column("varchar",{ 
        nullable:false,
        length:200,
        default:"ols",
        name:"coinname"
        })
    coinname:string;
        

    @Column("tinyint",{ 
        nullable:false,
        default:"0",
        name:"type"
        })
    type:number;
        

    @Column("decimal",{ 
        nullable:false,
        precision:10,
        scale:2,
        name:"num"
        })
    num:string;
        

    @Column("decimal",{ 
        nullable:true,
        precision:10,
        scale:2,
        name:"mum"
        })
    mum:string | null;
        

    @Column("decimal",{ 
        nullable:true,
        precision:10,
        scale:2,
        name:"fee"
        })
    fee:string | null;
        

    @Column("int",{ 
        nullable:false,
        name:"created_at"
        })
    created_at:number;
        

    @Column("int",{ 
        nullable:false,
        name:"status"
        })
    status:number;
        
}
