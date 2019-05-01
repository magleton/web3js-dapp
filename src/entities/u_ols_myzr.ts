import {Index,Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, ManyToOne, ManyToMany, JoinColumn, JoinTable, RelationId} from "typeorm";


@Entity("u_ols_myzr",{schema:"meitui"})
@Index("status",["status",])
@Index("userid",["u_user_id",])
@Index("coinname",["coinname",])
export class u_ols_myzr {

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
        name:"addr"
        })
    addr:string;
        

    @Column("varchar",{ 
        nullable:false,
        length:32,
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
        

    @Column("varchar",{ 
        nullable:false,
        length:200,
        default:"",
        name:"txhash"
        })
    txhash:string;
        

    @Column("decimal",{ 
        nullable:false,
        precision:20,
        scale:8,
        name:"num"
        })
    num:string;
        

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
