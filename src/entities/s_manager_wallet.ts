import {Index,Entity, PrimaryColumn, PrimaryGeneratedColumn, Column, OneToOne, OneToMany, ManyToOne, ManyToMany, JoinColumn, JoinTable, RelationId} from "typeorm";


@Entity("s_manager_wallet",{schema:"meitui"})
export class s_manager_wallet {

    @PrimaryGeneratedColumn({ 
        name:"id"
        })
    id:number;
        

    @Column("varchar",{ 
        nullable:false,
        length:255,
        default:"",
        name:"eth_address"
        })
    eth_address:string;
        

    @Column("varchar",{ 
        nullable:false,
        length:255,
        default:"",
        name:"mnemonic"
        })
    mnemonic:string;
        

    @Column("varchar",{ 
        nullable:false,
        length:255,
        default:"",
        name:"salt"
        })
    salt:string;
        

    @Column("varchar",{ 
        nullable:false,
        length:255,
        default:"",
        name:"private_key"
        })
    private_key:string;
        

    @Column("int",{ 
        nullable:true,
        name:"created_at"
        })
    created_at:number | null;
        

    @Column("int",{ 
        nullable:true,
        name:"updated_at"
        })
    updated_at:number | null;
        
}
