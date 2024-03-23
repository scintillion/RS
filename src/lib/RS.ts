export namespace RS1 {

	/*
      vID is a class representing a named value, which also had an ID related to its
      index (position) within an ordered list of like items.  vIDs are stored in
      vLists which are defined by a string in the format

      ListName|Element1Name:Desc e1|Element2Name: Description or value|...|ElementN:asdf|

      The last character in the vList string defines its Element Delimiter, in the
      case above, '|'.  The colon character ':' terminates the name (and cannot appear
      within the name), and each ElementNames may NOT start with a numeric character
      (0..9,-,+) since these are illegal in variable names.

      An element in the vList is starts and terminates with the Element Delimiter
      taking the format |ElementName:ElementDesc|.  Therefore, it is easy to search a
      vList for a particular Element by its name, in the form "|Element:".  The
      end of the Element is the last character before |.

      vLists can be used to maintain lists of defined constants for programmers, but
      conveniently provide a way to display those values to the user through their
      element names and descriptions.  (In such a case, their position in the list is
      fixed and provides the ID (index) value of the defined constant.  (See the ToDC
      function in the vID class).

      vLists and their defining string can also be used to provide configuration
      parameters for an object such as a Tile: e.g. |TileCfg|AL=UL|Color=Blue|Height=23|

      Because vLists and their vIDs are defined by strings, they can be used to
      pass data between machines or foreign tiles.  They can efficiently represent the
      data of diverse objects, e.g. user record
      "User|Name:Doe1234|FullName:John Doe:Email:scintillion@gmail.com|Value:123.96|Phone:16055551414|"

      Once passed to an object, a vList can be left AS IS, without deliberately
      parsing and expanding its data, because the individual elements are quickly
      accessed, each time as needed, using highly efficient string search.

      The vID for a list element returns the Name and Desc fields (strings),
      along with the ID (the index within the vList, which is fixed), and the
      Value field which is a number (if Desc is a number, Value will be set).

      A special case of a vList is a RefList, which is a list of indexes referring
      to a fully defined vList, with the form "vListName|1|5|23|" where the
      RefList includes elements #1, #5, #23 from the vList named "vListName".
      Note that if a vID is selected from the RefList, in this case, #2, it would
      select the second element in the list, whose name is "5".  Since there is no
      name terminator ':', we know this is a reflist element with no description field,
      but for consistency, we set the description field to match the name "5".  And the
      Value field for the vID is set to the numeric value of its name/descriptor = 5.

      By using a complete vList along with a RefList defining a subset of its
      elements, we can create lists of elements to display to the user.  The ToLine
      function of the vID creates such a line, with the Description in the first
      part of the line (readable by the user), and (if delimiter is provided), a
      second portion of the string defining the index/ID and the Name.

    */

	
	const sleep=async (ms=1)=>await new Promise((r)=>setTimeout(r,ms));
	type StoreBuffer = string | ArrayBuffer | Function | undefined;

	export const NameDelim = ':',PrimeDelim = '|',TabDelim = '\t',LineDelim = '\n',FormDelim = '\f';
	export const FormatStart = '[',FormatEnd = ']';
	export const tNone='?',tStr='$',tNum='#',tAB='[',tPack='&',tList='@',tData='^',tID='+';

	export enum CLType {
		None,
		Std,
		Name,
		ID,
		Pack
	}

	var _editTile = 'S';

	export function setEditTile (T='S') { _editTile = T; myTile = T; }

	export function log (...args:string[]) {
		console.log (args);
		return args;
	}

	export function soft (...args:string[]) {
		console.log (args);
		return args;
	}

	export function hard (...args:string[]) {
		console.log (args);
		return args;
	}

	// Note: these variables ONLY used by Client, should be set to ''
	// or '!ERROR' on Server just to be safe!
	export var myServer='';
	export var mySession=0;
	export var myTile='S';
	export var myVilla='S';

	type SpecArgs=string|BufPack|RSData;

	interface NewData { (P:BufPack) : RSData }

	interface PackFunc { (Pack : BufPack) : BufPack }
	interface PackToDataFunc { (P:BufPack,Type:string) : RSData }
	function NILPackFunc (P : BufPack) { return P; }

	interface ABReq { (AB : ArrayBuffer) : Promise<ArrayBuffer> }
	interface StrReq { (Query : string) : Promise<RS1.BufPack> }
	interface PackReq { (Pack : BufPack) : Promise<BufPack> }
	interface DataReq { (D : RSData) : Promise<RSData> }
	interface RIDReg { (R: RID) : void }

	export async function NILDataReq (D:RSData) : Promise<RSData>
		{ throw "NILDataReq"; return NILData; }
	export function NILNew () { throw 'NILNew'; return NILData; }

	export var _ReqAB : ABReq;
	var _ReqPack : PackReq;
	export var _RegRID = '';

	const InitStr = 'InitReq must be called before Request Operations!';

	function NData () { return new RSData () }

	export async function ReqAB (AB : ArrayBuffer): Promise<ArrayBuffer> {
		if (_ReqAB) {
			let response = await _ReqAB (AB);
			// console.log ('ReqAB.response bytes = ' + response.byteLength.toString ());
			return response;
		}
		else {
			throw InitStr;
			return NILAB;
		}

		let Q : any;
		Q = ()=>new RSData;
		let RP : NewData = Q as NewData;

		Reg (['List',()=>new vList (),NILDataReq])
	}

	var dNames=new Array<string>, dNews=new Array<NewData>,dEdits=new Array<DataReq>;

	export function Reg (A:any[]=[]) {
		// Args: NameStr, New(RSData)Func, Edit(RSData)Func
		let count = A.length;

		if (count % 3) {
			throw 'Reg requires triplets';
			return;
		}
		if (!count) { //clearing previous}
			dNames = [];  dNews = [];  dEdits = [];
		}

		if (!dNames.length)	// Need to add default system list
			Reg (['List',NILNew,NILDataReq]);	

		for (let i = 0; i < count; i += 3) {
			let Name = A[i] as string;

			if (!Name)
				throw ('NULL Name in Reg!');

			let NewFunc = A[i+1] as NewData, EditFunc=A[i+2] as DataReq;
			let f = dNames.indexOf (Name);
			if (f >= 0) {	//	replacing
				dNames[f] = Name; dNews[f] = NewFunc; dEdits[f]=EditFunc;
			}
			else { dNames.push (Name); dNews.push (NewFunc); dEdits.push (EditFunc); }
		}
	}
	
	export async function ReqPack (BP : RS1.BufPack) : Promise<RS1.BufPack>{
	  if (_ReqPack) {
		  let returnBP = await _ReqPack (BP);
		  // console.log ('ReqPack.BP = ' + BP.desc);
		  return returnBP;
	  }
	  else {
		  throw InitStr;
		  return NILPack;
	  }
	}
	
	export function InitReq (AB : ABReq, Pack : PackReq) {
		_ReqAB = AB;
		_ReqPack = Pack;
		console.log ('Functions Assigned!');
		return true;
	}
	
	export async function ReqStr (Query : string, Tile:string) : Promise<RS1.BufPack> {
		if (!Tile)
			return NILPack;

		let DPos = Query.indexOf (PrimeDelim);
		let StrType;
		if (DPos >= 0) {
			StrType = Query.slice (0,DPos);
			Query = Query.slice (DPos + 1);
		}
		else StrType = 'Q';

		let BP = new BufPack ();
		console.log ('StrType=' + StrType + ',Query=' + Query + '.');
		BP.xAdd (StrType,Query);
		BP.add (['.T',Tile]);
		
//		BP.add ([StrType,Query]);
	
		// console.log ('strRequest BP on client:\n' + BP.Desc ());
		// console.log ('BP.BufOut length = ' + BP.BufOut ().byteLength.toString ());
	
		let BPReply = await ReqPack (BP);
		return BPReply;
	}

	export async function ReqTiles () : Promise<string[]> {
		let BP = await ReqStr ('SELECT name from sqlite_master;','Q');
		// let TestBP = BP.copy ();
		// console.log (BP.desc);	// <----- my code/data works if THIS LINE IS running!
		
		let SQStr = "sqlite_";
		let SQLen = SQStr.length;

		let BPs = BP.unpackArray ();
		let Names : string[] = [];

		for (const P of BPs) {
			let Name = P.str ('name');
			// console.log ('Name:' + Name);

			if (Name.slice (0,SQLen) !== SQStr) {
				Names.push (Name);
				// console.log ('  ' + Name);
			}
		}

		// console.log ('After BP Ds= ' + BP.Ds.length.toString () + ' = ' + BP.desc);
		console.log ('ReqTiles=' + Names);
		return Names;
	}

	export class ReqInfo {
		Tile = 'S';
		Name = '';
		Type = '';
		Sub = '';
		Fields = '*';
		ID = 0;
	}
	
	export async function ReqPacks (R : ReqInfo) : Promise<BufPack[]> {
		let QStr = 'SELECT ' + R.Fields + ' FROM ' + R.Tile;
		let Condits = [];
		
		if (R.Type)
			Condits.push ('type=\'' + R.Type + '\'');
		if (R.Sub)
			Condits.push ('sub=\'' + R.Sub + '\'');
		if (R.Name)
			Condits.push ('name=\'' + R.Name + '\'');
		if (R.ID)
			Condits.push ('id='+R.ID.toString ());

		if (Condits.length) 
			QStr += ' WHERE ' + Condits.join (' AND ') + ';';
		else QStr += ';';

		let BP = await ReqStr  (QStr,R.Tile);

		if (BP.multi)
			return BP.unpackArray ();
		else return [];
	}

	export async function ReqByInfo (R : ReqInfo) : Promise<RSData[]> {
		let BPs = await ReqPacks (R);

		let Datas = new Array<RSData> (BPs.length);
		let i = 0;
		for (const P of BPs)
		{
			let D = new RSData (P);
			Datas[i++] = D;
		}
		return Datas;
	}

	export async function ReqRecs (Tile = 'S', Type = '', Sub = '', Name = '') : Promise<RSData[]>
	{
		let Info = new ReqInfo ();
		Info.Tile = Tile;
		Info.Type = Type;
		Info.Sub  = Sub;
		Info.Name = Name;
		return await ReqByInfo (Info);
	}

	export async function ReqBufPack (Tile = 'S', ID : number|string) : Promise<BufPack>
	{
		let Info = new ReqInfo ();
		Info.Tile = Tile;
		if ((typeof ID) === 'string')
			Info.Name = ID as string;
		else Info.ID = ID as number;

		let Datas = await ReqPacks (Info);
		if (Datas.length === 1)
			return Datas[0];

		return NILPack;		// found NONE, or TOO MANY!
	}

	export async function ReqData (Tile = 'S', ID : number|string) : Promise<RSData>
	{
		let P = await ReqBufPack (Tile, ID);
		return (P !== NILPack) ? new RSData (P) : NILData;
	}

	export async function ReqNames (Tile = 'S', Type = '', Sub = '') : Promise<RSData[]>
	{
		let Info = new ReqInfo ();
		Info.Tile = Tile;
		Info.Type = Type;
		Info.Sub  = Sub;
		Info.Fields = 'name,desc,id';
		return await ReqByInfo (Info);
	}

	export async function ReqNames2 (Tile = 'S', Type = '', Sub = '') : Promise<RSData[]> {
		let QStr = 'SELECT * FROM ' + Tile + ' ';
		let TypeXP = Type ? ('type=\'' + Type + '\'') : '';
		let SubXP = Sub ? ('sub=\'' + Sub + '\'') : '';
		let WhereXP = ';';

		if (TypeXP && SubXP)
			WhereXP = 'WHERE ' + TypeXP + ' AND ' + SubXP + ';';
		else if (TypeXP)
			WhereXP = 'WHERE ' + TypeXP + ';'
		else if (SubXP)
			WhereXP = 'WHERE ' + SubXP + ';'

		QStr += WhereXP;
		
		let BP = await ReqStr  (QStr,Tile);
		// console.log ('BP Promised!' + BP.desc);
		
		if (!BP.multi)
			return [];

		let BPs = BP.unpackArray ();

		let Data = new Array<RSData> (BPs.length);
		let i = 0;
		for (const P of BPs)
		{
			let D = new RSData ();

			D.LoadPack (P);
			Data[i++] = D;
		}

		return Data;
	}

	

	export function Download(filename: string, text: string) {
		var e = document.createElement('a');

		e.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
		e.setAttribute('download', filename);
		e.style.display = 'none';
		e.click();
	}

	export function isDigit(ch: string): boolean {
		if (ch)
			ch = ch[0];
		else return false;

		if ((ch <= '9')  &&  ch.length)
				return ((ch >= '0') || (ch === '-') || (ch === '.'));

		return false;
	}		

	export function ChkBuf (Buf : ArrayBuffer) {
		const UInt8View = new Uint8Array (Buf);

		let Sum = 0, i = 0;
		for (const B of UInt8View)
			Sum += B * ((++i & 31) + 1);

		return Sum;
	}

	function isDelim(ch: string): boolean {
		if (ch <= '|') {
			return ch === '|' || (ch >= TabDelim && ch <= FormDelim);
		} else return false;
	}

	export function FromString(Str: string) {
		let Strs = Str.split(LineDelim);

		let limit = Strs.length;
		for (let i = 0; i < limit; ++i) {
			let Pos = Strs[i].indexOf(TabDelim);
			if (Pos >= 0) Strs[i] = Strs[i].slice(0, Pos).trimEnd();
		}

		return Strs;
	}

	type SelectArgs = HTMLSelectElement | HTMLOListElement | HTMLUListElement | undefined;
	type OptionArgs = HTMLOptionElement | undefined;
	type IOArgs = BufPack | Function | undefined;

	// Convert DBclass to/from BufPack
	export interface DataVert {
		(In: IOArgs): IOArgs;
	}

	export class DataConvert {
		Name: string;
		Convert: DataVert;

		constructor(Name1: string, Conv1: DataVert) {
			this.Name = Name1;
			this.Convert = Conv1;
		}
	}

	export function FmtStrFromDesc(Desc: string) {
		if (Desc[0] === FormatStart) {
			let EndPos = Desc.indexOf(FormatEnd);
			if (EndPos >= 0) return Desc.slice(1, EndPos);
		}

		return '';
	}

	const NILNums:number[]=[];
	const NILStrs:string[]=[];

	export class IValue {
		_Str: string = '';
		Nums: number[] = [];
		Strs: string[] = [];
		Error: string = '';

		get Num(): number | undefined {
			return this.Nums && this.Nums.length === 1 ? this.Nums[0] : undefined;
		}
		get Str(): string | undefined {
			return this.Strs && this.Strs.length === 1 ? this.Strs[0] : undefined;
		}
	}

	export class IFmt {
		Type: number = 0;
		Ch = ''; // first char denoting type of format
		// Str='';
		Xtra='';
		Value: IValue = new IValue();
		Num = 0;
		List: vList|undefined;
		Arr: number[] | undefined;

		/*  Input Formats, defined by [FormatStr]

            FormatStr starts with first character which defines its nature,
            followed by additional characters in some cases

            # - number (including floating point)
            I - integer
            Onn - ordinal integers, 0 allowed to indicate none (nn is limit if present)
            R - StartNumber  COMMA  EndNumber
            P - integer pair
            Ann - number array (COMMA separated)  (nn specifies size limit for array)
            {} - set of allowed strings inside brackets, choose one (or NONE)
            @ListName - choose member from named list
            $ - dollar amount, allows two digit cents included $$$.cc
            %nn - string limited to nn characters
            Unn - uppercase string




        */

		static create (Type : string|number,Xtra='',Value:string|number='') {
			let Fmt = new IFmt ('');
			Fmt.setType (Type);
			if (Xtra)
				Fmt.setXtra (Xtra);
			if (Value)
				Fmt.setValue (Value);
			return Fmt;
		}

		get TypeStr () { 
			let i = TypeArray.indexOf (this.Type);
			return (i >= 0) ? TypeNames[i] : '';
		}

		setXtra (Str1='') {
			if (this === NILFmt)
				return;

			switch (this.Type) {
				case FMMember:
					if (!(this.List = CL.ListByName(Str1))) this.Xtra = Str1 + ' = Bad List Name';
					break;

				case FMRange:
					if (Str1.indexOf(',')) {
						this.Arr = new Array(2);
						this.Arr[0] = Number(Str1);
						this.Arr[1] = Number(Str1.slice(Str1.indexOf(',') + 1));
					} else this.Xtra = Str1 + ' = Bad Range';
					break;

				case FMSet:
					if (Str1[Str1.length - 1] === '}')
						Str1 = Str1.slice(1, Str1.length - 1); // clip it from ends
					else Str1 = Str1.slice(1);

					this.Xtra = Str1 = ',' + Str1 + ','; // every member starts/ends with ,
					break;
/*
				case FMNum:		do nothing for these, can ignore
				case FMInt:
				case FMPair:
					break;
				case FMOrd:
				case FMNums:
				case FMStr:
				case FMUpper:
					break;
*/
			}

			this.Xtra = Str1;
		}

		setValue(Val:string|number='') {
			if (this === NILFmt)
				return;

			let vType = typeof (Val);
			let ValStr = (vType === 'string') ? 
				(Val as string) : (Val as number).toString ();

			this.Value._Str = ValStr;

			this.Value.Nums = [];
			this.Value.Strs = [];
			this.Value.Error = '';

			switch (this.Type) {
				case FMNum:
				case FMInt:
				case FMDollar:
				case FMRange:
				case FMOrd:
					let Num = Number(ValStr);
					if (Num || (Num === 0))
						this.Value.Nums.push(Num);
					else this.Value._Str = '';
					break; // single number

				case FMStrs:
					this.Value.Strs = ValStr.split(',');
					break;

				case FMPair:
				case FMNums:
					let Strs = ValStr.split(',');
					let limit = Strs.length;
					for (let i = 0; i < limit; ) this.Value.Nums.push(Number(Strs[i++]));
					break; // multiple numbers

				case FMStr:
				case FMUpper:
				case FMSet:
					this.Value.Strs.push(ValStr);
					break; //  string

				default:
					this.Value.Error = 'Invalid Type';
					break;
			}
		}

	ParseValue(ValStr: string = '') {
		if (ValStr) {
			this.Value._Str = ValStr;
		} else ValStr = this.Value._Str;

		this.Value.Nums = [];
		this.Value.Strs = [];
		this.Value.Error = '';

		switch (this.Type) {
			case FMNum:
			case FMInt:
			case FMDollar:
			case FMRange:
			case FMOrd:
				this.Value.Nums.push(Number(this.Value._Str));
				break; // single number

			case FMStrs:
				this.Value.Strs = this.Value._Str.split(',');
				break;

			case FMPair:
			case FMNums:
				let Strs = this.Value._Str.split(',');
				let limit = Strs.length;
				for (let i = 0; i < limit; ) this.Value.Nums.push(Number(Strs[i++]));
				break; // multiple numbers

			case FMStr:
			case FMUpper:
			case FMSet:
				this.Value.Strs.push(this.Value._Str);
				break; //  string

			default:
				this.Value.Error = 'Invalid Type';
				break;
		}
	}


	setType (Str : string|number) {
		if (this === NILFmt)
			return;

		let index = 0;
		let TypeNum = 0;

		if ((typeof Str) === 'number') {
			TypeNum = Str as number;
			index = TypeArray.indexOf (TypeNum);
			if (index >= 0) {
				this.Ch = TypeChars[index];
				return this.Type = TypeNum;
			}
			return 0;	// no luck, bad type number
		}

		// setting Type by String
		let Str1 = Str as string;
		if (!Str)
			return 0;

		if (Str1.length === 1) {
			index = TypeChars.indexOf (Str1);
			if (index >= 0)
			{
				this.Ch = Str1;
				return this.Type = TypeArray[index];
			}
			return 0;
		}

		// Named String...
		index = TypeNames.indexOf (Str1);
		if (index < 0)
			return 0;	// bad type name

		this.Ch = TypeChars[index];
		this.Type = TypeArray[index];			
		return this.Type;
	}

		constructor(Str1: string) {
			let NoError = true;

			if (!Str1) {
				return;
			}

			if (Str1[0] === FormatStart) {
				let EndPos = Str1.indexOf(FormatEnd);
				if (EndPos >= 0) {
					Str1 = Str1.slice(1, EndPos);
				}
			}

			let ValPos = Str1.indexOf('=');
			let V;
			if (ValPos >= 0) {
				V = new IValue();
				V._Str = Str1.slice(ValPos + 1);
				this.Value = V;
				Str1 = Str1.slice(0, ValPos);
			}

			this.setType (Str1.slice (0,1).toUpperCase ());
			if (Str1.length > 1) {
				this.Xtra = Str1.slice(1);
				if (V) {
					if (isDigit(Str1[0])) this.Num = Number(this.Xtra);
				}
				this.setXtra (this.Xtra);
			} else this.Xtra = Str1 = '';

			this.setValue(this.Value._Str);
		}

		ToStr() {
			if (this.Type)
			return (
				FormatStart + this.Ch + this.Xtra +
				(this.Value._Str ? '=' + this.Value._Str : '') +
				FormatEnd
			);

			return '';
		}
	}

	export const NILFmt = new IFmt ('');


	export class NameData {
		Name: string;
		DataType: string;
		Buffer = NILAB;

		constructor(Name1: string, DType: string, Buf: ArrayBuffer = NILAB) {
			this.Name = Name1;
			this.DataType = DType;
			this.Buffer = Buf;
		}
	}
	export class NameBuffer {
		Name: string;
		Type: string;
		Buffer: IOArgs;
		Data: any | undefined;

		constructor(Name1: string, DType: string, Buf: IOArgs = undefined) {
			this.Name = Name1;
			this.Type = DType;
			this.Buffer = Buf;
		}
	}

	export function ME() { }
	export function dVilla() { }	// default villa, based on includes (ME vs. system villa)

	export function setVilla (V : string) {
		if (!V) return;

		if (V === ('-' + myVilla))
			myVilla = '';

		else if (!myVilla)
			myVilla = V;
	}



	export class RID {		// Relational ID, used for all RSData records
		villa='';
		tile='';
		type='';
		sub='';
		ID=NaN;
		multi:number[]|string|undefined;
		
		fromStr (Str='') {
			// String format: ID(s separated by ,)_TileName,VillaName
			// VillaName,	if '', assume ME()
			// TileName		must ALWAYS be set
			//	ID(#)  * means ALL (0)
			// if VillaName absent, use ME (myVilla)
			if (!Str) return;

			let NPos = Str.indexOf ('_');
			if (NPos < 0)
				throw ('_ required!');

			let numStr = Str.slice (0,NPos), vStr = Str.slice (NPos + 1);
			let CPos = vStr.indexOf (',');
			if (CPos >= 0) {
				this.villa = vStr.slice (0,CPos);
				this.tile = vStr.slice (CPos+1);
			}
			else {
				this.tile = vStr;
			}

			switch (numStr[0]) {
				case '?' : this.multi = numStr.slice (1); break; 	// query string
				case 'T' :
					let Comma = numStr.indexOf (',');
					if (Comma > 0) {
						this.sub = numStr.slice (Comma+1);
						this.type = numStr.slice (1,Comma);
					}
					else this.type = numStr.slice (1);
					this.ID = 0;
					break;

				default : 
					if (numStr.indexOf (',') >= 0)	{	// multiple number IDs!
						let Nums = numStr.split (',');
						let i = 0, count = Nums.length;
						let Ns=Array<number>(count);
						for (const N of Nums) {
							Ns[i]=Number (Nums[i]);
							++i;
							}
						this.multi=Ns;
					}
					else {	// single ID, no comma
						this.ID = Number (numStr);
					}
				}
		}

		constructor (Str='') { this.fromStr (Str); }

		get toStr () {
			let VTStr = this.villa ? (this.villa + ',' + this.tile) : this.tile;

			let NStr = '';
			let M = this.multi;

			if (M) {
				if ((typeof M) === 'string') {		// query string
					NStr += '?' + M as string;
				}
				else {	// number array (IDs)
					let A = M as Array<number>;
					let len = A.length;
					if (len) {
						for (let i = 0; i < len;++i) {
							NStr += A[i].toString () + ((i < len-1) ? ',' : '');
						}
					}
					else NStr += 'NaN';
				}
			}
			else {		// single ID number
				NStr += this.ID ? this.ID.toString () : '0';
			}

			return NStr + '_' + VTStr;
		}

		Reg () {
			if (_RegRID  &&  (this.villa != _RegRID))
				this.villa = _RegRID;
		}

		copy () {
			return new RID (this.toStr);
		}
	}

	export const NILRID = new RID ('');

	export class IData {
		ID = 0;
		Name = '';
		Desc = '';
	}

	export class RSData {
		Name = '';
		Desc = '';
		Type = '';
		private _rID = NILRID;
		_Tile = 'S';
		Sub = '';
		Str = '';
//		ID = 0;
		List = NILList;
		Pack = NILPack;
		Details = '';
		Data: any;

		NameBufs: NameBuffer[] | undefined;

		PostLoad (P : BufPack) {}

		get ID () { return this._rID !== NILRID ? this._rID.ID : 0; }
		get RID () { return this._rID.copy (); }

		get Tile () { return this._Tile; }
		get Villa () { return this._rID.villa; }

		private setTile (T='S') {
			this._Tile = T;
			this._rID.tile = T;
		}

		setRID (rID1 : RID) {
			if (this === NILData)
				return;

			if ((this._rID === NILRID) || !this._rID.ID)
				this._rID = rID1;
			}

		get preDesc () {
			return this.Name + '[' + this.Type + ']' + (this.Desc? (':'+this.Desc):''); 
		}

		get desc () { return this.preDesc; }


		LoadPack(P: BufPack) {
			if (this === NILData)
				return;

			if (P === NILPack)
				return;

			this.Name = P.str ('name');
			this.Desc = P.str ('desc');
			this.Type = P.str ('type');
			this.setTile (P.str ('.T'));
			this.Str = P.str ('str');
			this.Sub = P.str ('sub');
			// this.ID = P.num ('.ID');
			this.List = P.list ('list');
			this.Pack = P.pack('pack');

			let ridStr = P.str ('.rid');
			if (ridStr) {
				this._rID = new RID (ridStr);
				RS1.log ('Assigning RID "' + ridStr + '" to ' + this.desc)
			}

//			if (!this.ID)
//				this.ID = P.num ('id');

			this.Details = P.str ('details');
			this.Data = P.data ('data');

			this.PostLoad (P);
		}

		constructor (P = NILPack) {
			this.LoadPack (P);
		}

		PostSave (P : BufPack) {}
		SavePack (P : BufPack = NILPack) {
			if (P === NILPack)
				P = new BufPack ();

			P.add([	'name',	this.Name,
				'desc',	this.Desc,
				'type',	this.Type,
				'.T',	this.Tile,
				'str',	this.Str,
				'sub', this.Sub,
				'details',	this.Details,
				'.ID',	this.ID,
				'list', this.List,
				'pack', this.Pack,

				'data',	this.Data
			]);

			this.PostSave (P);
			return P;
		}

		ToValue() {
			let ValStr = '';
			return this.Name + ',' + this.Type + ',' + this.ID.toString() + ValStr;
		}

		FromOption(Item: SelectArgs) {
			let text, value;

			if (this === NILData)
				return;

			if (Item instanceof HTMLOptionElement) {
				let Option = Item as HTMLOptionElement;
				text = Option.text;
				value = Option.value;
			} else if (Item instanceof HTMLOListElement) {
				let OItem = Item as HTMLOListElement;
				text = OItem.innerText;
				value = OItem.attributes.getNamedItem('value');
			} else if (Item instanceof HTMLUListElement) {
				let UItem = Item as HTMLUListElement;
				text = UItem.innerText;
				value = UItem.attributes.getNamedItem('value');
			}
		}

		static ToFrom(In: IOArgs): IOArgs {
			// Should raise exception!
			return undefined;
		}

		async toDB () {
			if (this === NILData)
				return;

			if (!this.Tile) this.setTile ('S');

			let P = this.SavePack ();
				P.xAdd ('Q',this.ID ? 'U' : 'I');

			P = await RS1.ReqPack (P);
			return P.num ('changes') > 0;
		}

		NewThis () : RSData { return new RSData (); }

		copy () {
			let P = this.SavePack ();
			return new RSData (P);
		}
	}

	export const NILData = new RSData ();
	export const NILIDs = new Array<number>();

	const SiNew='$', SiLoad='B', SiEdit='D';

	class SpecInfo {
		type:string;
		pack=NILPack;
		rsData=NILData;

		cName='';
		dType='';

		constructor (Data : SpecArgs) {
			if (typeof (Data) === 'string')
			{
				this.type = Data as string;
				if (this.type) {
					this.cName = 'String';
					this.dType = SiNew;
				}
			}
			else {
				this.cName = Data.constructor.name;
				if (this.cName === 'BufPack') {
					this.type = (this.pack = (Data as BufPack)).str ('type');
					this.dType = SiLoad;
				}
				else {
					this.type = (this.rsData = (Data as RSData)).Type;
					this.dType = SiEdit;
				}
			}
		}
	}

	export function SpecData (Data : SpecArgs) : RSData {
		let SI=new SpecInfo(Data);

		if (!SI.dType)
			return NILData;		// abort, illegal

		switch (SI.type) {
			case 'List' : switch (SI.dType) {
				case SiNew : return new vList (NILList.getStr);
				case SiLoad : return new vList (SI.pack.str('data'));
				case SiEdit : return new vList (SI.rsData.Data as string);
				}
				break;

			case '' : switch (SI.dType) {
				case SiNew : return new RSData ();
				case SiLoad : return new RSData (SI.pack);
				case SiEdit : return SI.rsData;	
				}
				break;
		}

		// Move these into standard functions in the RSData class which 
		// can be overwritten by descendants!!

		return NILData;
	}

	export class RSDataType {
		Type : string;
		Func : Function;

		constructor (Type1 : string, Func1 : Function) {
			this.Type = Type1;
			this.Func = Func1;
			if (!(Func1 instanceof RSData))
				throw 'NOT RSData!'
		}
	}

	var PTDs = new Array<PackToDataFunc> ();

	export function PackToData (P : BufPack) : RSData {
		let Type = P.str ('type');

		switch (Type) {
			case 'List' : return new vList (P);
		}

		for (const PTD of PTDs) {
			let D = PTD (P, Type);
			if (D != NILData)
				return D;
			}

		return NILData;
	}

	var _Types : string[] = [];
	var _Classes = new Array<Function> ();

	export function RegPackToData (PTD : PackToDataFunc) {

	}

	export function DataToSelect(Data: RSData[], Select: SelectArgs) {}

	export function SelectToData(Select: SelectArgs): RSData[] {
		return [];
	}

	export function RSDataVert(In: IOArgs): IOArgs {
		if (In) {
			if (In.constructor.name === 'BufPack') {
				let Pack = In as BufPack;
				let Data = new RSData();
				Data.Name = Pack.str('name');
				Data.Type = Pack.str('type');
				Data.Str = Pack.str('str');
			} else {
				// must be class for conversion
			}
		} else return undefined;
	}

	const NewTileStrings: string[] = [
		'ABC:Tile Description',
		'T\ta|name:Full|\ts|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|\t',
		' T\ta|name:Top|\ts|background:magenta|min-height:150px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'   T\ta|name:Top|\ts|background:magenta|min-height:50px|\t',
		'   T\ta|name:Bottom|\ts|background:magenta|min-height:100px|\t',
		'  T\ta|name:Right|\ts|background:cyan|width:100%|display:flex|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:white|min-height:350px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'  T\ta|name:Middle|\ts|background:cyan|width:100%|display:flex|\t',
		'  T\ta|name:Right|\ts|background:yellow|min-width:200px|\t'
	];

	const TileStrings: string[] = [
		'T\ta|name:Full|\ts|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|\t',
		' T\ta|name:Top|\ts|background:magenta|min-height:150px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'   T\ta|name:Top|\ts|background:magenta|min-height:50px|\t',
		'   T\ta|name:Bottom|\ts|background:magenta|min-height:100px|\t',
		'  T\ta|name:Right|\ts|background:cyan|width:100%|display:flex|\t',
		' T\ta|name:Bottom|\ts|display:flex|flex-direction:row|background:white|min-height:350px|\t',
		'  T\ta|name:Left|\ts|background:green|min-width:100px|\t',
		'  T\ta|name:Middle|\ts|background:cyan|width:100%|display:flex|\t',
		'  T\ta|name:Right|\ts|background:yellow|min-width:200px|\t'
	];

	class TileID {
		tnum: number;
		vnum: number;
		tname: string;
		vname: string;
		_Str: string;

		constructor(Str: string) {
			Str = Str.trim();
			this._Str = Str;

			let NamEnd = Str.indexOf(NameDelim);
			if (NamEnd >= 0) {
				this.tname = Str.slice(0, NamEnd);
				this.vname = Str.slice(NamEnd + 1);
			} else {
				this.tname = Str;
				this.vname = '';
			}

			this.tnum = 0;
			this.vnum = 0;
		}

		Valid(): boolean {
			if (this.tnum) return true;
			else if (this.tname) return true;

			return false;
		}

		ToString(): string {
			if (this.vname) return this.tname + NameDelim + this.vname;
			return this.tname;
		}
	}

	export class TDE extends RSData {
		//  TileDefElement, for defining Tiles
		level = 0;
		tileID: TileID | undefined;
		TList: vList | undefined;
		Childs: vList[] | undefined;
		aList: vList | undefined;
		sList: vList | undefined;
		vList: vList | undefined;
		jList: vList | undefined;

		nLists = 0;
		parent = 0;
		prev = 0;
		next = 0;
		first = 0;
		last = 0;

		constructor(Str: string, List1: vList | undefined = undefined) {
			super();

			if (Str) List1 = new vList(Str);

			if (List1) {
				this.TList = List1;
				// console.log('TDE List[' + this.List.Name + ']=' + this.List.Str + '.');

				this.Childs = List1.Childs;

				if (this.Childs) {
					this.Childs.forEach((Child) => {
						if (Child.Name === 'a') {
							this.aList = Child;
							console.log('\taList =' + Child.LStr);
						} else if (Child.Name === 's') {
							this.sList = Child;
							console.log('\tsList =' + Child.LStr);
						} else if (Child.Name === 'v') this.vList = Child;
						else if (Child.Name === 'j') this.jList = Child;

						console.log('   TDE Child[' + Child.Name + ']=' + Child.LStr + '.');
					});
				}

				this.level = List1.Indent;
				this.tileID = new TileID(List1.Name);
			}
		}
	}

	export class TileCache {
		First: vList | undefined;

		constructor(ListStrs: string[]) {
			// 'Name:Addr|TileName1|..|TileNameN|"  ("*" is ALL)
			let limit = ListStrs.length;

			for (let i = 0; i < limit; ) {
				let Str = ListStrs[i++].trim();

				let List = new vList(Str, this.First);
				if (!this.First) this.First = List;
			}
		}

		LoadTile(ID: TileID) {}

		GetID(TileName: string): TileID | undefined {
			return undefined;
		}
	}

	export class pList {
		IDType = '';
		ValType = 0;
		count = 0;
		numIDs : number[]=[];
		strIDs : string[]=[];
		values : any[]=[];

		constructor (SampleID : number|string|BufPack|RSData) {
			let IDType = (typeof SampleID);
			switch (IDType) {
				case 'number' : this.IDType = tNum; break;
				case 'string' : this.IDType = tStr; break;
				case 'object' :
					let IDType = SampleID.constructor.name;
					if (IDType === 'BufPack')
						this.IDType = tPack;
					else if (SampleID instanceof (RSData))
						this.IDType = tData;
					else if (SampleID instanceof IData)
						this.IDType = tID;
					else this.IDType = tNone;
			}
		}

		index (ID : number|string) {
			if ((this.IDType === tNum)  ||  (this.IDType === tID))
				return this.numIDs.indexOf (ID as number);
			else return this.strIDs.indexOf (ID as string);
		}

		add (IDList :string|any[]) {
			let Arr=[];
			let len,numID=0,strID='';
			let IDT=this.IDType;
			let Nums = (IDT === tNum);

			if ((typeof IDList) === 'string') {
				if (IDList[0] === PrimeDelim)
					IDList = (IDList as string).slice (1);
				if (IDList[IDList.length-1] === PrimeDelim)
					IDList = (IDList as string).slice (0,(IDList as string).length - 1);

				let Strs = (IDList as string).split ('|');
				len = Strs.length;
				if ((len & 1)  || !len)
					throw ('Requires pairs of ID/value');

				Arr.length = len;
				for (let i = 0; i < len; i += 2) {
					Arr[i] = Nums ? Number(Strs[i]) : Strs[i];
					Arr[i+1]=Strs[i+1];
				}
			}
			else { Arr = IDList as any[]; len = Arr.length; }

			if (!len  || (len & 1))
				throw 'Requires pairs of ID/value';

			let NullID = Nums? 0 : '';

			for (let i = 0; i < len; i += 2) {
				let ID = Arr[i];

				let ind = this.index (ID);
				if (ind >= 0)	//we found, must replace it!
					this.values[ind] = Arr[i+1];
				else {	// new ID, must add...
					ind = this.index (NullID);
					if (ind >= 0) {	// found an empty slot
						if (Nums)
							this.numIDs[ind] = ID as number;
						else this.strIDs[ind] = ID as string;

						this.values[ind] = Arr[i+1];
					}
					else {
						if (Nums)
							this.numIDs.push (ID as number);
						else this.strIDs.push (ID as string);

						this.values.push (Arr[i+1]);
						this.count++;
					}
				}
			}
		}

		del (ID : number|string) {
			let ind = this.index (ID);
			if (ind < 0)
				return false;

			let Nums = this.IDType === tNum;
			if (Nums) {
				this.numIDs[ind] = 0;
			}
			else this.strIDs[ind] = '';
			this.values[ind] = undefined;
		}

		push (D : BufPack|RSData) {
			this.add ([(D.constructor.name === 'BufPack') ?
				(D as BufPack).str ('rid') : (D as RSData).RID.toStr, D]);
		}
		
		static isListStr (Str:string) {
			return  (Str  &&  Str.indexOf (PrimeDelim)  &&
			    (Str.slice (-1) !== PrimeDelim));
		}

		get toStr () {
			let Nums = (this.IDType === tNum);
			let Str = '';

			let len = Nums ? this.numIDs.length : this.strIDs.length;

			for (let i = 0; i < len;) {
				let IDStr = Nums ? this.numIDs[i].toString () : this.strIDs[i];
				if (!IDStr &&  IDStr === '0')
					continue;	// skip the blanks

				let ValStr = this.values[i].toString ();

				Str += IDStr + PrimeDelim + ValStr + ((++i < len) ? PrimeDelim : '');
			}
			return Str;
		}
	}

	export class vID  {
		// often abbreviated as VID
		List: vList;
		Values: number[] = [];
		Name='';
		Desc='';
		ID=0;
		Fmt: IFmt | undefined;

		get IDByName () {
			return this.List ? this.List.IDByName(this.Name) : 0;
		}

		constructor(Str: string, List1: vList = NILList) {
			let Desc1 = '', NameEnd = Str.indexOf(NameDelim);

			if (NameEnd >= 0) {
				this.Name = Str.slice(0, NameEnd);
				Desc1 = Str.slice(NameEnd + 1);
			} else	this.Name = Str;

			if (Desc1) {
				let FmtStr = FmtStrFromDesc(Desc1);
				if (FmtStr) {
					Desc1 = Desc1.slice(FmtStr.length + 2);
					this.Fmt = new IFmt(FmtStr);
				}
			} else Desc1 = this.Name;

			this.Desc = Desc1;
			this.List = List1;

			if (isDigit(Desc1)) {
				if (Desc1.indexOf(',') < 0) {
					// single number
					this.Values.push(Number(Desc1));
				} else {
					// array of numbers, comma separated
					let Strs = Desc1.split(',');
					let limit = Strs.length;
					this.Values = [];

					for (let i = 0; i < limit; ) this.Values.push(Number(Strs[i++]));
				}
			}

			this.Desc = Desc1;
		}

		ToDC(Prefix: string): string {
			return Prefix + this.Name + '=' + this.ID.toString();
		}

		ToLine(Delim1: string = '') {
			if (Delim1) {
				return this.Desc + Delim1 + this.Name + NameDelim + this.ID.toString();
			} else return this.Desc;
		}

		ToStr(): string {
			if (!this.Desc || this.Name === this.Desc) return this.Name;

			let RetStr = this.Name + NameDelim;
			if (this.Fmt) RetStr += this.Fmt.ToStr();

			return RetStr + this.Desc;
		}

		ToValueStr(): string {
			if (this.Fmt) {
				let Val = this.Fmt.Value;
				if (Val) {
					if (Val.Num) return '=' + Val.Num.toString();
					if (Val.Nums) return '=' + Val.Nums.toString();
					if (Val.Str) return '=' + Val.Str;
					if (Val.Strs) return '=' + Val.Strs.toString();
				}
			}
			return '';
		}

		ToFmtStr(): string {
			let Fmt = this.Fmt;
			if (Fmt) {
				let VStr = FormatStart + Fmt.Ch;

				if (Fmt.Num) VStr += Fmt.Num.toString();

				return VStr + this.ToValueStr() + FormatEnd;
			}
			return '';
		}

		ToExtraStr(): string {
			return this.ToFmtStr() + this.Name + ':' + this.ID.toString();
		}

		ToSelect(Select: SelectArgs) {
			if (Select && Select instanceof HTMLSelectElement) {
				let Option: HTMLOptionElement = Select.ownerDocument.createElement(
					'option'
				) as HTMLOptionElement;

				let Desc = this.Desc ? this.Desc : this.Name;
				let Value = '';
				if (Desc[0] === FormatStart) {
					let Pos = Desc.indexOf('=');
					if (Pos >= 0) {
						Value = Desc.slice(Pos + 1);
						let EndPos = Value.indexOf(FormatEnd);
						if (EndPos >= 0) Value = Value.slice(0, EndPos);
					}
				}

				Option.text = Desc;
				Option.value = this.Name;
				Select.options.add(Option);
			}
		}

		ToList(Select: HTMLOListElement | HTMLUListElement | null) {
			if (!Select) {
				return;
			} else if (!(Select instanceof HTMLOListElement) && !(Select instanceof HTMLUListElement)) {
				return;
			}

			let item: HTMLLIElement = Select.ownerDocument.createElement('li') as HTMLLIElement;

			item.innerText = this.Desc;
			Select.appendChild(item);
		}

		static ToFrom(In: IOArgs): IOArgs {
			// Should raise exception!
			return undefined;
		}

		copy () : vID {
			return new vID (this.ToStr (),this.List);
		}
	} // class vID


	export class vList extends RSData {
		Type = 'List';
		LStr = '';
		protected _Delim = PrimeDelim;
		private _FirstDelim = 0;
		protected _Count = 0;
		protected _Next: vList | undefined;
		protected _IDs: number[] | undefined;
		_NameIDs = '';
		LType: CLType = CLType.None;
		protected _Childs: vList[] | undefined;
		protected _Indent = 0;

		get notNIL () {
			if (this === NILList) {
			   log ('NILList!'); return false;
		   }
		   return true;
	   }

	   get Count() {
			return this._Count;
		}

		get desc ():string {
			this.notNIL;

			return this.preDesc + ' LStr=' + this.LStr;
		}

		get Childs() {
			return this._Childs;
		}

		get getStr() {
			if (this.LType != CLType.Pack) return this.LStr;

			if (!this.Childs) return '';

			let Strs = [this.LStr.slice(0, this.LStr.length - 1)];
			let limit = Strs.length;
			for (let i = 0; i < limit; ) {
				let Child = this.Childs[i++];
				if (Child) Strs.push(Child.LStr);
			}

			return Strs.join(this._Delim) + this._Delim;
		}

		PostSave (P : BufPack) { P.add (['data', this.getStr]); console.log ('PostSave vList'); }
		PostLoad (P : BufPack) { this.LStr = P.str ('data'); this.Data = NILAB; console.log ('PostLoad vList'); }


		get Indent() {
			return this._Indent;
		}

		get IDs(): vID[] | undefined {
			return this.IDs;
		} // only sensible for RefList, returns undefined if not
		get Next() {
			return this._Next;
		}
		get Delim() {
			return this._Delim;
		}
		get FirstChild(): vList | undefined {
			if (this._Childs) return this._Childs[0];
		}

		Merge(AddList: vList | undefined): boolean {
		    this.notNIL;

			let DestStrs = this.LStr.split(this._Delim);
			DestStrs.length = DestStrs.length - 1;
			let Destlimit = DestStrs.length;
			let Appended = 0, Replaced = 0;
			
			console.log('Merging Dest:');

			for (let i = 0; i < Destlimit; ++i) console.log('Q1  ' + DestStrs[i]);

			if (!AddList) return false;

			let AddStrs = AddList.LStr.split(AddList._Delim);

			let Addlimit = AddStrs.length - 1; // don't use last!
			console.log('Adding List');
			for (let i = 0; i < Addlimit; ++i) console.log('Q2  ' + AddStrs[i]);

			let NameD, Name;

			for (let i = 0; ++i < Addlimit; ) {
				let Pos = AddStrs[i].indexOf(NameDelim);
				let Replacer = Pos >= 0;
				Name = Replacer ? AddStrs[i].slice(0, Pos) : AddStrs[i];
				NameD = Name + NameDelim;

				for (let j = 0; ++j < Destlimit; ) {
					if (DestStrs[j].startsWith(Name)) {
						// at least partial match, is it full?
						if (DestStrs[j].startsWith(NameD) || DestStrs[j] == Name) {
							// TRUE match
							if (Replacer || DestStrs[j] == Name) {
								// need to replace
								// console.log('Replacing with ' + AddStrs[i]);
								DestStrs[j] = AddStrs[i];
								++Replaced;
								Name = ''; // done, no more processing
							} else {
								Name = '';
								break; // TRUE match, not replaced, we are done
							}
						}
					}
				}

				// not found, need to add at end...
				if (Name) {
					// still active
					// console.log('Appending ' + AddStrs[i]);
					++Appended;
					DestStrs.push(AddStrs[i]);
				}
			}

			if (Replaced || Appended) {
				let NewStr = DestStrs.join(this._Delim) + this._Delim;
				this.InitList(NewStr);
			}

			return false;
		}

		SetDelim(NewDelim: string): boolean {
		    this.notNIL;

				let OldDelim = this._Delim;

			if (!NewDelim || NewDelim.length != 1 || NewDelim == OldDelim || isDigit(NewDelim))
				return false;

			this.LStr.replace(OldDelim, NewDelim);
			this._Delim = NewDelim;
			return true;
		}

		private VIDByPos(Pos1: number): vID | undefined {
			if (Pos1 < 0) return undefined;

			let EndPos = this.LStr.indexOf(this._Delim, Pos1);
			if (EndPos < 0) return undefined;

			let FoundStr = this.LStr.slice(Pos1, EndPos);
			return new vID(FoundStr, this);
		}

		SortVIDs(VIDs: vID[]) {
			let limit = VIDs.length;
			var Temp: vID;

			for (let i = 0; ++i < limit; ) {
				for (let j = i; --j >= 0; ) {
					if (VIDs[j].Desc > VIDs[j + 1].Desc) {
						Temp = VIDs[j];
						VIDs[j] = VIDs[j + 1];
						VIDs[j + 1] = Temp;
					} else break;
				}
			}
		}

		ByIDs(IDs: number[], Sort: boolean = false): vID[] {
			if (!IDs) {
				// copy all in list
				let i = this._Count;
				IDs = new Array(i);
				while (--i >= 0) IDs[i] = i + 1;
			}

			let VIDs: vID[] = [];
			for (let i = IDs.length; --i >= 0; ) {
				let VID = this.GetVID(IDs[i]);
				if (VID) VIDs.push(VID);
			}

			if (Sort) this.SortVIDs(VIDs);

			return VIDs;
		}

		NameList(UseList = 1): string {
		    this.notNIL;

			if (UseList && this._NameIDs) return this._NameIDs;

			let Str1 = this.LStr;
			let Start = this._FirstDelim - 1;
			let Delim1 = this._Delim;
			let ID = 0;
			let NameStr = Delim1;

			while ((Start = Str1.indexOf(Delim1, Start)) >= 0) {
				let EndDelim = Str1.indexOf(Delim1, ++Start);
				if (EndDelim < 0) break;
				let NewStr = Str1.slice(Start, EndDelim);

				let EndName = NewStr.indexOf(NameDelim);
				if (EndName >= 0) NewStr = NewStr.slice(0, EndName);

				++ID;
				NameStr += NewStr + NameDelim + ID.toString() + Delim1;
			}

			this._NameIDs = NameStr;
			this._Count = ID;
			return NameStr;
		}

		IDByName(Name: string) {
			let Delim1 = this._Delim;
			let SearchStr = Delim1 + Name + NameDelim;
			let NameList = this.NameList();
			let Pos = NameList.indexOf(SearchStr);
			if (Pos >= 0) {
				let Start = Pos + SearchStr.length;
				let End = Start;
				let Str;

				while (NameList[++End] != Delim1);

				let Num = Number((Str = NameList.slice(Start, End)));
				if (isNaN(Num)) {
					// console.log('QQQNameList 999 Str=' + Str + ' Name=' + Name + ' NameList=' + NameList);
					Num = 999;
				}
				return Num;
			}
			return 0;
		}

		NameByID(ID: number) {
			if (ID <= 0 || ID > this._Count) return '';

			let Str = this.NameList();
			let Delim1 = this._Delim;
			let SearchStr = ':' + ID.toString() + Delim1;
			let Pos = Str.indexOf(SearchStr);
			if (Pos >= 0) {
				let Start = Pos;
				while (Str[--Start] != Delim1);
				return Str.slice(Start + 1, Pos);
			}

			return '';
		}

		Dump(DumpStr: string) {
			if (this.Name && this._Indent)
				console.log(
					DumpStr +
						'Dump:' +
						this.Name +
						' Indent = ' +
						this._Indent?.toString() +
						' #C =' +
						this.Childs
						? this.Childs?.length.toString()
						: '0' + ' Count = ' + this.Count.toString() + ' Str=' + this.LStr
				);

			if (this._Childs) {
				let limit = this._Childs.length;

				for (let i = 0; i < limit; ++i) {
					this._Childs[i].Dump(DumpStr + '   ');
				}
			}
		}

		private InitList(Str1: string | string[]) {
		    this.notNIL;

			if (!Str1)
				Str1 = PrimeDelim;

			this._NameIDs = '';
			this._Indent = 0;

			if (Array.isArray(Str1)) Str1 = Str1.join('\n') + '\n';

			let StrLen = Str1.length;

			let NamePos = 0; // default start of Name
			let Ch = Str1[0];
			if (Ch <= '9') {
				if (Ch <= ' ') {
					while (Ch === ' ' || Ch === '\t') {
						this._Indent++;
						Ch = Str1[++NamePos];
					}
				} else if (Ch >= '0') {
					let Zero = '0'.charCodeAt(0);
					this._Indent = Ch.charCodeAt(0) - Zero;
					if ((Ch = Str1[++NamePos]) >= '0' && Ch <= '9') {
						// second digit (only two allowed)
						this._Indent = this._Indent * 10 + Ch.charCodeAt(0) - Zero;
						++NamePos;
					}
				}
			}

			let Delim1 = Str1[StrLen - 1];

			this._FirstDelim = -1;

			if (!isDelim(Delim1)) {
				let i = NamePos;
				while (i < StrLen)
					if (isDelim((Delim1 = Str1[i]))) {
						this._FirstDelim = i;
						Str1 += Delim1; // add (missing) delim to end of string
						++StrLen;
						break;
					} else ++i;

				if (i >= StrLen) return; // panic, no Delim
			}

			this._Delim = Delim1;
			// Note that delimiter is typically '|', placed at end of string, but \0 could
			// be used if one wished to allow '|' to appear within the const description

			this._Childs = undefined;
			this._IDs = undefined;

			if (this._FirstDelim < 0) this._FirstDelim = Str1.indexOf(Delim1, NamePos);

			if (Delim1 < ' ') {
				// special case, embedded vLists!
				this._Count = 0;
				this.LType = CLType.Pack;

				let Strs = Str1.split(Delim1);
				let limit = Strs.length;

				if (limit <= 0) return; // panic, no strings, should never happen

				Str1 = '';
				--limit;
				for (let i = 0; ++i < limit; ) {
					if (Strs[i][0] === '/' || !Strs[i].trim()) continue; //	ignore comment lines

					let Child: vList = new vList(Strs[i]);
					if (Child) {
						if (!this._Childs) this._Childs = [];
						this._Childs.push(Child);

						if (!Str1) Str1 = Strs[0] + Delim1; // we are just finding the first line (Name:Desc)
					}
				}
			}

			let NameStr = Str1.slice(NamePos, this._FirstDelim);

			let i = NameStr.indexOf(NameDelim);
			if (i >= 0) {
				this.Desc = NameStr.slice(i + 1);
				this.Name = NameStr.slice(0, i);
			} else {
				for (let lim = NameStr.length, i = 0; i < lim; ++i)
					if (NameStr[i] <= ' ') {
						NameStr = NameStr.slice(0, i);
						if ((NameStr = '')) NameStr = 'Q';
						break;
					}

				this.Desc = this.Name = NameStr;
			}

			console.log('InitList (' + this.Name + '), NameStr =' + NameStr + '.');

			this.LStr = Str1;

			//			console.log ('InitList ' + this._Name + ' Indent = ' + this._Indent.toString () + ' #C =' +
			//				this.ChildCount.toString () + ' Count = ' + this.Count.toString () + ' Str=' + this._Str);

			if (Delim1 < ' ') return; // done processing, vList with kids...

			let FirstChar = Str1[this._FirstDelim + 1];

			let IDList = isDigit(FirstChar);
			this.LType = IDList ? CLType.ID : CLType.Std;

			if (IDList) {
				let N = 0, limit = StrLen - 1;
				let Pos: number[] = Array(99);
				Pos[0] = 0;

				for (let i = this._FirstDelim - 1; ++i < limit; ) {
					if (Str1[i] === Delim1) {
						Pos[++N] = Number(Str1.slice(i + 1, i + 25));
					}
				}
				this._Count = N;
				Pos.length = N + 1;
				this._IDs = Pos;
			}

			this.NameList();
		}

		constructor(Str1: string | string[] | BufPack = '', First: vList | undefined = undefined) {
			let Str, Strs, BP;
			
			super ();
			if ((typeof Str1) === 'string') {
				this.InitList (Str1 as string);
			}
			else if (Array.isArray (Str1)) {
				this.InitList (Str1 as string[]);
			}
			else {
				let BP = Str1 as BufPack;
				this.InitList (BP.str ('data'));
			}

			if (First) {
				let Last = First;

				this._Next = undefined;

				while (Last._Next && Last._Next.Name != this.Name) Last = Last._Next;

				this._Next = Last._Next;
				Last._Next = this; // add our vList to the list of vLists
			}
		}

		GetDesc(Name: string): string | undefined {
			let SearchStr = this._Delim + Name + NameDelim; // e.g. '|NameXYZ:''
			let Pos1 = this.LStr.indexOf(SearchStr, this._FirstDelim);
			if (Pos1 >= 0) {
				let StartPos = Pos1 + SearchStr.length;
				let EndPos = this.LStr.indexOf(this._Delim, StartPos);

				if (EndPos > 0) return this.LStr.slice(StartPos, EndPos);
			}
			return undefined;
		}

		GetNum(Name: string): number | undefined {
			let Str = this.GetDesc(Name);
			return Str ? Number(Str) : undefined;
		}

		GetStr(Name: string): string | undefined {
			let Str = this.GetDesc(Name);
			console.log('GetStr (' + Name + ') GetDesc returns "' + Str + '"');

			if (Str) {
				if (Str[0] === FormatStart) {
					let EndPos = Str.indexOf(FormatEnd, 1);

					if (EndPos > 0) return Str.slice(EndPos + 1);
					else console.log(FormatEnd + ' not present!');
				} else return Str;
			}
			return undefined;
		}

		static isListStr (Str:string) {
			return  (Str  &&  Str.indexOf (PrimeDelim)  &&
			    (Str.slice (-1) === PrimeDelim));
		}

		UpdateVID(VID: vID, Delete = false) {
		    this.notNIL;
			if (!VID) return;

			let Delim = this._Delim;
			let Str = this.LStr;

			let SearchStr = Delim + VID.Name;
			let Pos = Str.indexOf(SearchStr + Delim, this._FirstDelim);
			if (Pos < 0) {
				Pos = Str.indexOf(SearchStr + NameDelim, this._FirstDelim);
			}

			if (Pos >= 0) {
				let EndPos = Pos;

				while (Str[++EndPos] !== Delim);

				//if (EndPos < Str.length - 1) {
				// not the last element in list!
				if (Delete) Str = Str.slice(0, Pos) + Str.slice(EndPos);
				else Str = Str.slice(0, Pos + 1) + VID.ToStr() + Str.slice(EndPos);

				/*
				} else {
					if (Delete) Str = Str.slice(0, Pos + 1);
					else Str = Str.slice(0, Pos + 1) + VID.ToStr() + Delim;
				}
				*/
			} else {
				if (Delete) return; //	ABORT, should not happen!

				// VID not found, we must add to the end!
				Str += VID.ToStr() + Delim;
			}

			this.InitList(Str);
		}

		GetNamePos(Name: string): number {
			let SearchStr = this._Delim + Name; // e.g. '|NameXYZ:''

			let Pos1 = this.LStr.indexOf(SearchStr + NameDelim, this._FirstDelim);
			if (Pos1 >= 0) return Pos1;

			return this.LStr.indexOf(SearchStr + this._Delim, this._FirstDelim);
		}

		Bubble(Name: string, dir: number) {
			// check for special easy case - list of Childs
			if (this.LType == CLType.Pack) {
				if (!this._Childs) return;

				for (let i = this._Childs.length; --i >= 0; )
					if (this._Childs[i].Name === Name) {
						let First, Second;

						if (dir <= 0) {
							Second = i;
							First = i - 1;
							if (First < 0) return;
						} else {
							First = i;
							Second = i + 1;
							if (Second >= this._Childs.length) return;
						}

						let TempList = this._Childs[First];
						this._Childs[First] = this._Childs[Second];
						this._Childs[Second] = TempList;
						return;
					}

				return; // no match found
			}

			let Pos = this.GetNamePos(Name);
			if (Pos < 0) return -1; // cannot find, we are done

			let StartPos, EndPos;

			let First = '', Second = '';

			if (dir <= 0) {
				// bubble up
				for (StartPos = Pos; --StartPos >= 0; ) if (this.LStr[StartPos] == this._Delim) break;

				if (StartPos < 0) return -1; // cannot find previous

				EndPos = this.LStr.indexOf(this._Delim, Pos + 1);
				if (EndPos < 0) return -1;

				Second = this.LStr.slice(Pos, EndPos);
				First = this.LStr.slice(StartPos, Pos);
			} else {
				// bubble down
				StartPos = Pos;
				EndPos = this.LStr.indexOf(this._Delim, Pos + 1);
				let NextEnd;

				if (EndPos >= 0) {
					// found end of first
					First = this.LStr.slice(Pos, EndPos);
					NextEnd = this.LStr.indexOf(this._Delim, EndPos + 1);

					if (NextEnd < 0) return; // cannot find next

					Second = this.LStr.slice(EndPos, NextEnd);
					EndPos = NextEnd;
				} else return;
			}

			if (!First || !Second) return -1;

			let NewStr = this.LStr.slice(0, StartPos) + Second + First + this.LStr.slice(EndPos);
			this.InitList(NewStr);
		}

		GetVID(IDorName: string | number): vID | undefined {
			let SearchStr;

			let Name: string = typeof IDorName !== 'number' ? IDorName : this.NameByID(IDorName);
			let Pos1 = this.GetNamePos(Name);

			if (Pos1 >= 0) {
				// we found it
				return this.VIDByPos(Pos1 + 1);
			} else return undefined;
		}

		ByDesc(Desc: string) {
			let SearchStr = NameDelim + Desc;
			let Last = Desc.slice(-1);
			if (Last !== '*') 
				SearchStr += this._Delim;
			else SearchStr = SearchStr.slice (0,-1);

			// PrefixMatch the first characters of Desc, allows for
			// Type,ABC to match based on "Type," starting the Desc
			// does not work if [Format] is present
			let Pos1 = this.LStr.indexOf(SearchStr, this._FirstDelim);
			if (Pos1 >= 0) {
				for (let D = this._Delim, i = Pos1; --i > 0; ) {
					if (this.LStr[i] === D) return this.VIDByPos(i + 1);
				}

				return undefined;
			}
		}

		NameByDesc(Desc: string) {
			let SearchStr = NameDelim + Desc + this._Delim;

			let Pos1 = this.LStr.indexOf(SearchStr, this._FirstDelim);
			if (Pos1 >= 0) {
				for (let i = Pos1; --i > 0; ) {
					if (this.LStr[i] === this._Delim) return this.LStr.slice(i + 1, Pos1);
				}

				return '';
			}
		}

		ChildByName(Name1: string) {
			if (!this.Childs) return undefined;

			let limit = this.Childs.length;

			for (let i = 0; i < limit; ++i) {
				if (this.Childs[i].Name == Name1) return this.Childs[i];
			}

			return undefined;
		}

		GetLine(ID: any, Delim1: string = ''): string {
			let VID: vID | undefined = this.GetVID(ID);
			return VID ? VID.ToLine(Delim1) : '';
		}

		IDsToRefList(IDs: number[]): vList | undefined {
			if (IDs) {
				let Delim = this._Delim;
				let Ret = this.Name + Delim;
				for (let i = IDs.length; --i >= 0; ) {
					Ret += IDs[i].toString() + Delim;
				}

				return new vList(Ret);
			}
			return undefined;
		}

		VIDsToRefList(VIDs: vID[] | undefined): vList | undefined {
			if (VIDs) {
				let IDs: number[] = new Array(VIDs.length);

				for (let i = VIDs.length; --i >= 0; ) {
					IDs[i] = VIDs[i].ID;
				}

				return this.IDsToRefList(IDs);
			} else return undefined;
		}

		IDsToVIDs(IDs: number[] | undefined=undefined): vID[] {
			if (!IDs) {
				// if undefined, use every element (IDs 1..N)
				let limit = this._Count;
				IDs = new Array(limit);
				for (let i = limit; --i >= 0; IDs[i] = i + 1);
			}

			let VIDs: vID[] = new Array(IDs.length);
			let VID: vID | undefined;

			for (let i = IDs.length; --i >= 0; ) {
				VID = this.GetVID(IDs[i]);
				if (VID) VIDs[i] = VID;
			}

			return VIDs;
		}

		ToSortedVIDs(): vID[] {
			let VIDs = this.IDsToVIDs(undefined);
			this.SortVIDs(VIDs);
			return VIDs;
		}

		RefListToVIDs(Ref: vList): vID[] | undefined {
			if (Ref._IDs) return this.IDsToVIDs(Ref._IDs);
			return undefined;
		}

		IDsToLines(IDs: number[], Delim: string): string[] {
			let i = IDs.length;
			let Lines: string[] = new Array(i);
			let VID: vID | undefined;

			while (--i >= 0) {
				VID = this.GetVID(IDs[i]);
				Lines[i] = VID ? VID.ToLine(Delim) : '';
			}

			return Lines;
		}

		VIDsToLines(VIDs: vID[], Delim: string): string[] {
			let i = VIDs.length;
			let Lines: string[] = new Array(i);

			while (--i >= 0) Lines[i] = VIDs[i].ToLine(Delim);

			return Lines;
		}

		ToDC(): string {
			let VIDs = this.ToSortedVIDs();
			let limit = VIDs.length, FmtStr = '';

			let LineStr = '// ' + this.Name + NameDelim + this.Desc + '="' + this.LStr + '"\n';
			let Line = 'export const ';
			for (let i = 0; i < limit; ++i) {
				Line += VIDs[i].ToDC(this.Name) + ',';

				let VID = VIDs[i];
				if (VID.Fmt) {
					// print out format
					FmtStr += '//\t' + VID.Name + ' ~' + VID.Fmt.Ch;

					if (VID.Fmt.Xtra) FmtStr += ' Xtra="' + VID.Fmt.Xtra + '"';

					if (VID.Fmt.Num) FmtStr += ' Num=' + VID.Fmt.Num.toString();

					if (VID.Fmt.Type) FmtStr += ' Type=' + VID.Fmt.Type.toString();

					FmtStr += '\n';
				}
			}

			Line = Line.slice(0, Line.length - 1) + ';';
			while (Line.length > 70) {
				let i = 70;
				while (--i && Line[i] !== ',');

				LineStr += Line.slice(0, ++i) + '\n\t';
				Line = Line.slice(i);
			}
			LineStr += Line + '\n';

			LineStr += FmtStr;

			return LineStr;
		}

		ToSelect(Select: HTMLSelectElement | HTMLOListElement | HTMLUListElement) {
			let VIDs = this.IDsToVIDs(undefined);
			let VIDLen = VIDs.length;

			if (Select instanceof HTMLSelectElement) {
				Select.options.length = 0;
				for (let i = 0; i < VIDLen; ) VIDs[i++].ToSelect(Select);
			} else if (Select instanceof HTMLOListElement || Select instanceof HTMLUListElement) {
				for (let i = 0; i < VIDLen; ) VIDs[i++].ToList(Select);
			}
		}

		NewThis () : RSData { return new vList (this.getStr); }

		copy () {
			return new vList (this.getStr);
		}
	} // vList

	export const NILList = new vList ('');
	export const NILVID = new vID ('',NILList);

	export class vFast {
		Names : Array<string>=[];
		Values : Array<string>=[];

		constructor (Str1 : string|vList='') {
			let List = ((typeof Str1) === 'string') ? new vList (Str1 as string) : Str1 as vList;

			let VIDs = List.IDsToVIDs ();
			let count = VIDs.length;
			if (count) {
				this.Names.length = count;
				this.Values.length = count;

				let i = 0;
				for (const ID of VIDs) {
					this.Names[i] = ID.Name;
					this.Values[i++] = ID.Desc;
				}
			}
		}

		indexByName (name:string) {
			return this.Names.indexOf (name);
		}

		indexByValue (value : string) {
			return this.Values.indexOf (value);
		}

		indexByNum (num = 0) {
			return this.indexByValue (num ? num.toString () : '');
		}

		name (value : string) {
			let i = this.indexByValue (value);
			return (i >= 0) ? this.Names[i] : '';
		}

		value (name : string) {
			let i = this.indexByName (name);
			return (i >= 0) ? this.Values[i] : '';
		}

		add (NVs : Array<any>) {
			let Old = this.Names.length;
			let len = NVs.length
			if (len & 1)
				throw "Must be name/value pairs!";

			for (let i = 0; i < len;) {
				let name = NVs[i++];
				let value = NVs[i++];

				if (!name)
					throw 'Name must be set!';

				if (Old) {	// try to replace existing
					let found = this.Names.indexOf (name);
					if (found >= 0) {
						this.Values[found]=value;
						continue;
					}
				}

				this.Names.push (name);
				this.Values.push (value);
			}
		}

		del (name : string) {
			if (!name)
				throw "Cannot delete NULL name";

			let found = this.Names.indexOf (name);
			if (found >= 0) {
				this.Names[found]='';
				this.Values[found]='';
				return true;
			}
			else return false;
		}

		toList () {
			let LStr = PrimeDelim;
			let len = this.Names.length;

			for (let i = 0; i < len;++i) {
				let name = this.Names[i];
				if (name)
					LStr += name + NameDelim + this.Values[i] + PrimeDelim;
			}

			return new vList ((LStr.length > 1)?LStr : '');
		}

		clear () {
			this.Names=[];
			this.Values=[];
		}

		get empty () { 
			for (const N of this.Names) {
				if (N)
					return false;
			}

			return true;
		}

		get count () {
			let C = 0; 
			for (const N of this.Names) {
				if (N)
					++C;
			}

			return C;
		}
	}



	export class TileList extends vList {
		tiles: TDE[] = [];

		constructor(Str1: string[] | string, List: vList | undefined = undefined) {
			let limit, count = 0;

			super(Str1 as string);

			if (List) {
				if (List.LType != CLType.Pack || !List.Childs) {
					this.tiles = [];
					return;
				}

				limit = List.Childs.length;
				this.tiles = Array(++limit);
				for (let i = 0; i < limit; ) {
					this.tiles[++count] = new TDE('', List.Childs[i++]);
					// console.log('Handling Child ' + count.toString());
				}
			} else {
				let Strs: string[] = Array.isArray(Str1) ? Str1 : FromString(Str1); // Str.split (LineDelim);

				this.tiles = Array((limit = Strs.length + 1));
				for (let i = 0; ++i < limit; ) {
					console.log(i.toString() + '=' + Strs[i - 1]);

					if (Strs[i - 1][0] !== '!') {
						//						let TabPos = Strs[i-1].indexOf (TabDelim);
						//						if (TabPos >= 0)
						//							Strs[i-1] = Strs[i-1].slice (0,TabPos).trimEnd ();

						// console.log('Line==' + Strs[i - 1] + '.');

						let newTDE = new TDE(Strs[i - 1]);
						if (newTDE) {
							this.tiles[++count] = newTDE;
						}
					}
				}
			}

			this.tiles.length = count + 1;
			this.Links();
		}

		Links() {
			// calculate relations   for the TDEs
			let Tiles: TDE[] = this.tiles;
			let limit = Tiles.length;

			for (let tnum = 0; ++tnum < limit; ) {
				// each TDE/tile
				let i;

				let me = Tiles[tnum];
				let mylev = me.level;
				let parentlev = mylev - 1;
				let childlev = mylev + 1;
				let lev;

				me.first = me.next = me.parent = me.prev = 0;

				for (i = tnum; --i > 0; )
					if ((lev = Tiles[i].level) >= parentlev) {
						if (lev == parentlev) {
							me.parent = i;
							break;
						} else if (lev == mylev && !me.prev) me.prev = i;
					}

				for (i = me.last = tnum; ++i < limit; )
					if ((lev = Tiles[i].level) >= mylev) {
						if (lev === mylev) {
							me.next = i;
							break;
						}
						me.last = i;
						if (i > 10) console.log('i = ' + i.toString() + ':' + i);
						if (lev == childlev && !me.first) me.first = i; // first child
					} else break;
			} // for each TDE/tile
		}

		ToString(): string {
			let Tiles = this.tiles;
			let limit = Tiles.length;
			let Str = '';

			for (let i = 0; ++i < limit; ) {
				let me = Tiles[i];

				let NewStr =
					(me.TList ? me.TList.LStr : '@NOLIST@') +
					'\t' +
					i.toString() +
					'.level=' +
					me.level.toString() +
					' parent=' +
					me.parent.toString() +
					' prev=' +
					me.prev.toString() +
					' next=' +
					me.next.toString() +
					' first=' +
					me.first.toString() +
					' last=' +
					me.last.toString() +
					' #=' +
					(me.last - i + 1).toString() +
					' TileID=';

				if (me.tileID) NewStr += me.tileID.ToString();
				else NewStr += 'NONE';

				Str += NewStr + '\n';

				if (me.Childs) {
					for (let c = 0; c < me.Childs.length; ) {
						let List = me.Childs[c++];
						NewStr = '\t\t List.Name=' + List.Name + '=' + List.LStr;
						Str += NewStr + '\n';
					}
				}
			}
			return Str;
		}

		ToSelect(Select1: HTMLSelectElement | HTMLOListElement | HTMLUListElement | undefined) {
			let Tiles = this.tiles;
			let limit = Tiles.length;

			let Select = Select1 as HTMLSelectElement;

			Select.options.length = 0;

			for (let i = 0; ++i < limit; ) {
				let Option: HTMLOptionElement = document.createElement('option') as HTMLOptionElement;

				let Tile = Tiles[i];
				let List = Tile.TList;
				if (Tile && List && Tile.tileID) {
					let Str = '-----------------------------------------------------';
					Str = Str.slice(0, Tile.level * 3);
					Option.text = Str + i.toString() + '.' + Tile.tileID.ToString();
					//                  Option.value = this.ToExtraStr ();

					Option.setAttribute('name', 'N' + i.toString());
					let NameStr = Option.getAttribute('name');
					Option.style.color = 'pink';
					let ColorStr = Option.style.color;
					console.log('Option Name = ' + NameStr);
					console.log('Color = ', ColorStr);

					Select.options.add(Option);
				}
			}
		}
	}

	export class IOType {
		type: number = 0;
		subTypes: number[] | undefined;
	}

	export class JxnDef {
		name: string = '';
		process: number = 0;
		Input: IOType | undefined;
		Output: IOType | undefined;
	}

	export class ListOfLists {
		Lists: vList[] = [];

		ListByName(Name: string): vList | undefined {
			for (const L of this.Lists)
				if (L.Name === Name) return L;
		}

		Add(ListStr: string | string[]): vList | undefined {
			let ListStrs: string[] = (typeof ListStr === 'string') ? [ListStr] : ListStr;
			let List;

			for (const L of ListStrs) {
				this.Lists.push (List = new vList(L));
			}

			if (ListStrs.length <= 1)
				return List;
		}

		Merge(AOL: vList[]) {
			let ListLimit = this.Lists.length;
			if (!ListLimit) {
				//	empty list
				this.Lists = AOL;
				return;
			}

			for (let limit = AOL.length, i = 0; i < limit; ++i) {
				let Name = AOL[i].Name;
				let j = ListLimit;

				while (--j >= 0) {
					if (this.Lists[j].Name === Name) break;
				}

				if (j < 0) {
					this.Lists.push(AOL[i]);
					++ListLimit;
				}
			}
		}

		async Defines(FileName: string = 'Consts.ts') {
			let DocStr = '\n\n\n/*  Documentation Names/Desc\t___________________\n\n';

			let DefineStr = '/*\tDefines for vLists\t*/\n\n';

			let CList = vList;
			DefineStr += 'CList = ' + typeof CList + '\n';

			let limit = this.Lists.length;
			for (let q = 0; q < limit; ++q) {
				let List = this.Lists[q];

				DefineStr += List.ToDC();
				DocStr += '\n\nList ' + List.Name + '(' + List.Desc + ')\t' + List.LStr + '\n';
				let VIDs = List.ToSortedVIDs();
				for (let i = 0; i < VIDs.length; ++i) {
					let VID = VIDs[i];
					DocStr += VID.Name + '\t';
					if (VID.Fmt)
						DocStr +=
							'[' +
							VID.Fmt.Ch +
							(VID.Fmt.Num ? VID.Fmt.Num.toString() : '') +
							VID.Fmt.Xtra +
							']' +
							'\t';
					let ID = VID.List.IDByName(VID.Name); // VID.ID;
					// if (isNaN (ID))
					//   ID = 999;

					DocStr += VID.Desc + '\tID[' + VID.Name + ']==' + ID.toString() + '\n';
				}

				DocStr += 'NameList=' + List.NameList() + '\t' + List.Count + '\n';
			}

			console.log('Reading NewTileStrings!');
			let NewTileList = new vList(NewTileStrings);
			if (NewTileList) NewTileList.Dump('');
			console.log('Finished reading NewTileStrings');

			//			TL = new TileList(TileStrings);
			console.log('Testing NewTileList');
			TL = new TileList('', NewTileList);
			console.log('TileList is read from NewTileList');

			if (RS1.LstEdit.TileSelect) TL.ToSelect(RS1.LstEdit.TileSelect);

			let TString = TL.LStr;

			if (RS1.CL.LT && RS1.CL.AC) RS1.CL.LT.Merge(RS1.CL.AC);

			let LongList = new vList(TileStrings.join('\n') + '\n');

			DocStr += '\n Dump of LongList...\n' + LongList.Str + '\n End of LongList Dump.  \n';
			DocStr += 'LongList Name=' + LongList.Name + ' Desc=' + LongList.Desc + '\n\n';

			if (LongList) LongList.Dump('');

			DocStr += '\n' + TString + '\n*/\n';

			DefineStr += DocStr;

			if (this.Lists[0]) RS1.Download (FileName, DefineStr);

			for (let i = 0; i < CL.Lists.length; ++i) {
				let List = CL.Lists[i];
				let Pack = List.SavePack ();
				Pack.xAdd ('Q','I');
				RS1.sql.bInsUpd (Pack);
			}

			let BP = new BufPack('TEST', 'Details...asdfasdfas');
			BP.add([
				'Num1',
				123,
				'Num2',
				-789.123,
				'ShortStr',
				'ABC',
				'LongStr',
				'0123456789',
			]);

			console.log('Incoming Buf:' + '\n' + BP.desc);
			let NewBuf = BP.bufOut ();
			let Check1 = ChkBuf (NewBuf);

			BP.bufIn (NewBuf);
			console.log('Resultant Buf:' + '\n' + BP.desc);

			NewBuf = BP.bufOut ();
			let Check2 = ChkBuf (NewBuf);

			console.log ('Check1/2 = ' + Check1.toString () + ' ' + Check2.toString ());

			let IDList = new pList (0);
			IDList.add ('1|ABC|2|DEF|26|XYZ');
			IDList.add ('2|BCD|');
			console.log ('IDList=' + IDList.toStr + '.');
		}

		TovList(): vList | undefined {
			let limit = this.Lists.length;

			let LStrs: string[] = ['LL:ListOfLists'];
			let NewStr: string;

			for (let i = 0; i < limit; ++i) {
				let List = this.Lists[i];

				if (List.Desc && List.Desc !== List.Name) NewStr = List.Name + NameDelim + List.Desc;
				else NewStr = List.Name;

				LStrs.push(NewStr);
			}

			LStrs = LStrs.sort();

			return new vList(LStrs.join(PrimeDelim) + PrimeDelim);
		}

		ToSelect(Select: HTMLSelectElement) {
			let List = this.TovList();

			if (List) List.ToSelect(Select);
		}
	}

	//  ________________________________________________

	export class RsLOL extends ListOfLists {
		FM = this.Add('FM|Num|Int|Dollar|Ord|Range|Pair|Nums|Member|Set|Str|Strs|Upper|');

		/*  Input Formats, defined by~FormatStr~

            FormatStr starts with first character which defines its nature,
            followed by additional characters in some cases

            # - number (including floating point)
            I - integer
            Onn - ordinal (+) integers, 0 allowed to indicate none (nn is limit if present)
            R - StartNumber  COMMA  EndNumber
            P - integer pair
            Ann - number array (COMMA separated)  (nn specifies size limit for array)
            {} - set of allowed strings inside brackets, choose one (or NONE)
            @ListName - choose member from named list
            $ - dollar amount, allows two digit cents included $$$.cc
            %nn - string limited to nn characters
            Unn - uppercase string
        */

		PL = this.Add('|Number:#|String:$|ArrayBuffer:[|');

		FT = this.Add(
			'Ft|#:Num|I:Int|$:Dollar|P:Pair|O:Ord|A:Nums|%:Str|U:Upper|@:Member|R:Range|{:Set|'); // Added & tested full support for Num, Int, Str, Dollar, Nums, Range, Upper, Ord, Pair; Member Rough Support Added
		//
		CT = this.Add('Ct:ConnectType|Data|Event|Action|Queue|DB|SQL:SQLite|Remote|Retail|');

		LT = this.Add(
			'Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|'
		);

		DT = this.Add(
			'Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|'
		);
		EV = this.Add('Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|');
		RT = this.Add('Rt:Return|Ok|Fail|Equal|Unequal|Queue|');
		TD = this.Add('Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|');
		TS = this.Add(
			'Ts:TileSize|Fixed|T:Top|TL:Top Left|TR:Top Right|B:Bottom|BL:Bottom Left|BR:Bottom Right|L:Left|R:Right|SH:Shared|'
		);
		// Note that Tile Alignment is probably same as Tile Size, at least for now!
		Pr = this.Add('Pr:Process|Init|Read|Set|Clear|Default|');
		MT = this.Add('Mt:MessageType|Input|Output|Event|Trigger|Action|');
		AC = this.Add('Ac:Action|Init|Timer|Login|Logout|');
		LG = this.Add('Lg:Language|En:English|Es:Espanol|Cn:Chinese|');
		CY = this.Add('Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|');
		Test = this.Add('Test|NameF:~%12~First Name|XY:~P~XY Dim|Cost:~$~Dollar Price|');
	}

	export const CL = new RsLOL();
	const PL = CL.PL;

	export class LID {
		ListType: number;
		ID: number;
		Str: string = '';

		constructor(LT: number, ID1: number, Check = true) {
			this.ListType = LT;
			this.ID = ID1;

			if (Check) this.AsStr();
		}

		AsStr() {
			if (this.Str) return this.Str;
			if (!CL.Lists.length) return 'No Lists!';

			let RetStr = '';
			let Invalid = true;

			let ListVID: vID | undefined = CL.FM ? CL.FM.GetVID(this.ListType) : undefined;
			if (ListVID) {
				let List: vList | undefined = CL.ListByName(ListVID.Name);

				if (List) {
					let VID: vID | undefined = List.GetVID(this.ID);

					RetStr = ListVID.Name + NameDelim + ListVID.Desc;

					if (VID) {
						RetStr += ' = ' + VID.Name + NameDelim + VID.Desc;
						Invalid = false;
					} else RetStr += ' = Bad ID #' + this.ID.toString();
				} else RetStr = 'Cannot find Listname ' + ListVID.Name + ' # ' + ListVID.ID.toString;
			} else RetStr = 'Bad List #' + this.ListType.toString();

			if (Invalid) {
				RetStr = '@' + RetStr;
				this.ListType = 0 - this.ListType;
				this.ID = 0 - this.ID;
				// consider breakpoint or error here!
			}

			return (this.Str = RetStr);
		}
	} // LID

	//  _____________________________________

	export class ListEdit {
		MainList: HTMLSelectElement | null | undefined;
		DropList: HTMLSelectElement | null | undefined;
		ListSelect: HTMLSelectElement | null | undefined;
		TileSelect: HTMLSelectElement | null | undefined;

		MainSelectedID: number = 0;
		ListSelectedID: number = 0;

		NameEdit: HTMLInputElement | null | undefined;
		FormatEdit: HTMLInputElement | null | undefined;
		ValueEdit: HTMLInputElement | null | undefined;
		DescEdit: HTMLInputElement | null | undefined;
	}

	export const LstEdit = new ListEdit();
	let TL: TileList;

	export function BadTF(In: IOArgs): IOArgs {
		// Should raise exception!
		return undefined;
	}

	export class TFList {
		Names: string[] = [];
		Verts: DataVert[] = [];

		Bad = this.Add('Bad', BadTF);

		Add(Name: string, Vert: DataVert): DataVert | undefined {
			if (!Name || !Vert) return;

			let Pos = this.Names.indexOf(Name);
			if (Pos < 0) {
				this.Names.push(Name);
				this.Verts.push(Vert);
			} else this.Verts[Pos] = Vert;

			return Vert;
		}

		Del(Name: string) {
			let Pos = this.Names.indexOf(Name);
			if (Pos >= 0) {
				this.Names.splice(Pos, 1);
				this.Verts.splice(Pos, 1);
			}
		}
	}

	export const ToFroms = new TFList();

	export const NILAB = new ArrayBuffer (0);
	export const NILArray = new Uint8Array (NILAB);

	export function ABfromArray (Source : Int8Array) : ArrayBuffer {
		let AB = new ArrayBuffer (Source.length);
		let Dest = new Int8Array (AB);
		Dest.set (Source);

		return AB;
	}

	export function ab2str(AB : ArrayBuffer) {
		return new TextDecoder().decode(AB);
	  }

	export function str2ab(Str : string) {
		return new TextEncoder().encode(Str);
	}

	export function num2ab (N : number) : ArrayBuffer {
		if (N !== N)	//	NaN
			return NILAB;		

		let NewBuf = NILAB;		// default is NIL
		if (N % 1) {	// floating point
			NewBuf = new ArrayBuffer (8);
			let floats = new Float64Array (NewBuf);
			floats[0] = N;
			if (floats[0] !== N)
				console.log ('Float mismatch!');
			}
		else {
			let M = (N >= 0) ? N : -N;
			if (M < 128) {		// 1 byte
				NewBuf = new ArrayBuffer (1);
				let bytes = new Int8Array (NewBuf);
				bytes[0] = N;
				if (bytes[0] !== N)
					console.log ('Value mismatch!');

			}
			else if (M < 32000) {	// 2 byte
				NewBuf = new ArrayBuffer (2);
				let words = new Int16Array (NewBuf);
				words[0] = N;
				if (words[0] !== N)
					console.log ('Value mismatch!');
			}
			else if (M < 2000000000) { // 4 byte
				NewBuf = new ArrayBuffer (4);
				let longs = new Int32Array (NewBuf);
				longs[0] = N;
				if (longs[0] !== N)
					console.log ('Value mismatch!');
			}
			else { // need full float number size}
				NewBuf = new ArrayBuffer (8);
				let floats = new Float64Array (NewBuf);
				floats[0] = N;
				if (floats[0] !== N)
					console.log ('Value mismatch!');
			}
		}

//		console.log ('num2ab (' + N.toString () + ') = ' + NewBuf.byteLength.toString () + ' bytes');
//		let bytes = new Uint8Array (NewBuf);
//		console.log ('  ByteArray ' + NewBuf.byteLength.toString () + ' bytes = ' + bytes);

		return NewBuf;
	}

	export function ab2num (AB : ArrayBuffer) : number {
		let NBytes = AB.byteLength;
		let Num : number;

//		console.log ('  ab2num, ByteArray ' + NBytes.toString () + ' bytes = ' + bytes);

		switch (NBytes) {
			case 1 :
				let Bytes = new Int8Array (AB);
				Num = Bytes[0];
				break;
			case 2 :
				let Words = new Int16Array (AB);
				Num = Words[0];
				break;
			case 4 :
				let Longs = new Int32Array (AB);
				Num = Longs[0];
				break;
			case 8 :
				let Floats = new Float64Array (AB);
				Num = Floats[0];
				break;

			default : Num = NaN;
		}
		return Num;
	}

	export type PFData=string|number|ArrayBuffer|BufPack|vList|RSData;

	export class PackField {
		protected _name = '';
		protected _type = ' ';
		protected _data : any = NILAB;
		protected _error = '';
		protected _AB = NILAB;

		get notNIL () {
			 if (this === NILField) {
				log ('NILField!'); return false;
			}
			return true;
		}

		get copy () {
			let AB = this.toAB;
			return new PackField (this._name, AB, this._type);
		}

		from (Src : PackField) {
			this._name = Src._name;
			this._type = Src._type;
			let AB = Src.toAB;
			this.setByAB (AB, this._type);
		}

		get Type () { return this._type; }
		get Name () { return this._name; }
		get Str () { return (this._type === tStr) ? this._data as string : ''; }
		get Num () { return (this._type === tNum) ? this._data as number : NaN; }

		get AB () { return this._AB; }
		get Pack () {
			if (this._type !== tPack)
				return NILPack;

			return this._data ? this._data as BufPack : NILPack;
		 }
		get rsPack () { return (this._type == tData) ? this._data as BufPack : NILPack; }
		get List () {
			if (this._type !== tList)
				return NILList;

			return this._data ? this._data as vList : NILList; }

		get Error () { return this._error; }
		get Data () { return this._data; }

		get toAB () {
			let AB : ArrayBuffer;
			switch (this._type) {
				case tNum : AB = num2ab (this.Num); break;
				case tStr : AB = str2ab (this.Str); break;
				case tAB : return this._AB.slice (0);
				case tData : AB = (this._data as BufPack).bufOut (); break;
				case tPack : AB = this.Pack.bufOut (); break;
				case tList : AB = str2ab (this.List.getStr); break;
				default : AB = NILAB; this._error = 'toArray Error, Type =' + this._type + '.';
			}

			return this._AB = AB;
		}

		setData (D : PFData) {
		    this.notNIL;

			let Type;
			switch (typeof (D)) {
				case 'string' : Type = tStr; this._data = D; break;
				case 'number' : Type = tNum; this._data = D; break;
				default :
					if (!D) {
						this._data = NILAB;
						Type = tAB;
					} else
					{
						let CName = D.constructor.name;
						switch (CName) {
							case 'BufPack' :
								Type = tPack;
								this._data = (D as BufPack).copy ();
								break;
							case 'vList' :
								Type = tList;
								this._data = new vList ((D as vList).getStr);
								break;
							case 'ArrayBuffer' :
								Type = tAB;
								this._AB = (D as ArrayBuffer).slice (0);
								break;
							case 'Buffer' :
								Type = tAB;
								let TBuf = (D as Int8Array).slice(0);
								this._AB = ABfromArray (TBuf);
								break;
							default :
								if (D instanceof RSData) {
									Type = tData;
									this._data = (D as RSData).SavePack ();
									log ('setData:Not allowed without TypeLists, field='+this._name);
									// we cannot directly create the appropriate
									// RSData record because we don't have TypeLists
									// fully implemented
								}
								else
									throw ('tNone! Name =' + this._name + ' CName=' + CName);
									Type = tNone;
									this._data = NILAB;
								}
						}
			}
			this._type = Type;
		}

		clear () {
			let D : any;
			switch (this._type) {
				case tStr : D = ''; break;
				case tNum : D = NaN; break;
				case tPack : D = new BufPack (); break;
				case tAB : D = new ArrayBuffer (0); break;
				case tList : D = new vList (''); break;
				default : 
					D = NILAB;
			}
			this._data = D;
		}


		private setByAB (AB : ArrayBuffer,Type1 : string) {
		    this.notNIL;

			let D;
			switch (Type1) {
				case tStr : D = ab2str (AB); break;
				case tNum : D = ab2num (AB); break;
				case tPack : case tData :
					let Pack = new BufPack (); Pack.bufIn (AB);
					D = Pack;
					if (Type1 === tData)
						console.log ('setByAB: type = ' + Type1 + ' Not allowed without TypeLists, field='+this._name);
					// currently we cannot support tData by creating
					// the appropriate RSData record because we don't
					// have TypeLists fully implemented (Name/new/EditFunc)
					break;
				case tAB : D = AB.slice (0); break;
				case tList : D = new vList (ab2str (AB)); break;
				default : this._error = 'constructor error Type =' + Type1 + ', converted to NILAB.';
					Type1 = tAB;
					D = NILAB;
					AB = NILAB;
					break;
			}

			this._data = D;
			this._type = Type1;
		}

		private _setByBuf (Type : string, InBuffer : Int8Array | ArrayBuffer, Start = -1, nBytes = -1) {
		    this.notNIL;

			let ABuf : ArrayBuffer;
			let IBuf,TBuf : Int8Array;

			if (Start < 0) {
				Start = 0; nBytes = 999999999;
			}
			else if (nBytes < 0)
				nBytes = 999999999;

			let CName = InBuffer.constructor.name;
			if (CName === 'ArrayBuffer') {
				ABuf = (InBuffer as ArrayBuffer).slice (Start, Start + nBytes);
				IBuf = new Int8Array (ABuf);
			}
			else {	// Int8Array
				TBuf = (InBuffer as Int8Array).slice (Start, Start+nBytes);
				ABuf = ABfromArray (TBuf);
			}

			this.setByAB (ABuf, Type);
		}

		constructor (N : string, D : PFData,Type1='') {
			this._name = N;

			if (N === 'ist')
				throw 'ist!1';

			if (Type1)		// AB coming in with type
				this.setByAB (D as ArrayBuffer, Type1);
			else this.setData (D);
		}

		get NameVal () {
			let Str = this._type + this._name + '=';

			switch (this._type) {
				case tNum : Str += this.Num.toString (); break;
				case tStr : Str += this.Str; break;
				case tList : let L = this.List;
					Str += 'LIST=' + L.Name + ' Desc:' + L.Desc + ' Count=' + L.Count;
					break;
				case tPack : case tData : case tAB :
					 Str += '(' ;
					 if (this._type === tAB) {
							Str += this._AB.byteLength.toString () + ')';
							break;
					 }

					let Pack = this.Pack;

					Str += 'C:'+Pack.fetch('<').length.toString() + ' D:' + Pack.fetch('>').length.toString () + ')';
					break;

				default : Str += 'BADTYPE=' + this._type + ' ' + this.AB.byteLength.toString () + ' bytes';
			}

			return Str;
		}


		Equal (Ref : PackField) : boolean {
		    this.notNIL;

			if (this._type === Ref._type) {
				switch (this._type) {
					case tNum : return this.Num === Ref.Num;
					case tStr : return this.Str === Ref.Str;
					case tAB :
						let limit = this._AB.byteLength;
						if (Ref._AB.byteLength != limit)
							return false;

						let B = new Uint8Array (this._AB);
						let R = new Uint8Array (Ref._AB);

						for (let i = limit; --i >= 0;) {
							if (B[i] !== R[i])
								return false;
						}
						return true;	// no mismatch, equal.
					default : return false;
				}
			}
			return false;
		}

		get desc() {
			let Str = this.NameVal + ' ';

			switch (this._type) {
				case tNum : break; // Str += '= ' + this._num.toString (); break;
				case tStr : break; // Str += '= ' + this._str; break;
				case tList : break;
				case tPack : case tData :  
					let Pack = this.Pack;
					let Ds = Pack.fetch('>');
					for (const F of Ds)
						Str += ' ' + F.NameVal;
					break;
				case tAB : break;

				default : Str += ' DEFAULT AB, Type =' + this._type + ' ' + this._AB.byteLength.toString () + ' bytes'; break;
			}

			if (this._error)
				Str += ' ***ERROR*** ' + this._error;

			if (this === NILField)
				Str = 'NILField!';

			return Str;
		}
	}

	export const NILField = new PackField ('NIL!',NILAB);

	export class BufPack {
		_type = '';
		_details = '';

		Cs : PackField[] = [];
		Ds : PackField[] = [];

		get notNIL () {
			if (this === NILPack) {
			   log ('NILPack!'); return false;
		   }
		   return true;
	   }

	   get Type() { return this._type; }
		get Details () { return this._details; }

		get summary () {
			let Fields = this.Cs.concat (this.Ds);

			let Str = 'PACK';
			if (this._type)
				Str += ' Type:' + this._type;
			if (this.Details)
				Str += ' Details:' + this.Details;

			for (const Q of Fields)
				Str += ' ' + Q.Name;
			return Str;
		}

		fetch (Name='') : PackField[] {
			// Name = '' (ALL), Name = 'ABC.' ALL with ABC prefix,
			// Name = '.xyz' ALL with xyz suffix
			// Name = '>', ALL Ds  '<' ALL Cs

			if (!Name)
				return (this.Cs.concat (this.Ds)).slice(0);

			let Fields=[], len = Name.length;
			switch (Name[0]) {
				case '.' :	// all with suffix
					len = -len;
					for (const F of this.Ds) {
						if (F.Name.slice (len) === Name)
							Fields.push (F);
						}
					return Fields;
					break;

				case '>' : return this.Ds.slice (0); break;
				case '<' : return this.Cs.slice (0); break;
				default : 
						if (Name.slice(-1) !== '.')
							return	[];

						for (const F of this.Ds) {
							if (F.Name.slice (0,len) === Name)
								Fields.push (F);
						}
						return Fields;
			}
		}

		getField(Name: string): PackField {
			if (!Name)
				return NILField;

			let Fs = (Name >= '0') ? this.Ds : this.Cs;

			for (const F of Fs) {
				if (F.Name === Name)
					return F;
			}

			return NILField;
		}

		pushField (F:PackField) {
			let N=F.Name;
			if (!N  || (N >= '0'))
				this.Ds.push (F);
			else this.Cs.push (F);
		}

		addField (F:PackField) {
			let Name = F.Name;
			let Fs = (!Name  || (Name >= '0')) ? this.Ds : this.Cs;

			let Found = this.getField (Name);
			if (Found != NILField) {
				let index = Fs.indexOf (Found);
				if (index >= 0) {
					console.log ('AddField, Replacing ' + Fs[index].desc + ' with ' + F.desc);
					Fs[index] = F;
					return false;
				}
				throw 'Cannot find twice!';
				return false;
			}

			Fs.push (F);
			return true;	// added field
		}

		delField (F:PackField|string) {
			let Field = ((typeof F) === 'string') ? this.getField(F as string) : F as PackField;
			if (Field === NILField)
				return false;

			let index = this.Cs.indexOf (Field);
			if (index >= 0) {
				this.Cs.splice (index,1);
				return true;
			}
			if ((index = this.Ds.indexOf (Field)) >= 0) {
				this.Ds.splice (index,1);
				return true;
			}

			return false;
		}

		add(Args: any[]) {
		    this.notNIL;

			let limit = Args.length;
			let NotNull = this.Cs.length || this.Ds.length;

		    this.notNIL;

			if (Args.length & 1)
				return;		// must always be matching pairs (Name/Data), odd params not allowed

			for (let i = 0; i < limit; )
			{
				let FldName = Args[i++] as string;
				let Data = Args[i++];
				let NewField = new PackField(FldName,Data);

				if (NotNull)
					this.addField (NewField);
				else this.pushField (NewField);
			}
		}

		constructor(_type = '', _Details = '', Args : any[]=[]) {
			this._details = _Details;

			this._type = _type;
			//	console.log ('constructor SetType =' + _type);

			let BPos = _Details.indexOf(']');
			if (BPos > 0) _Details = _Details.slice(0, BPos);
			// trim ] and trailing text to avoid errors

			if (Args.length)
				this.add (Args);
		}

		xAdd (Type:string,Value:string|number) {
		    this.notNIL;

			let F = new PackField ('!'+Type,Value);

			if (this.Cs.length)	{
				let Old = this.Cs[0];
				this.Cs[0] = F;
				this.Cs.push (Old);
			}
			else this.Cs.push (F);
		}

		get xField () {
			if (this.Cs.length)
			{
				let F = this.Cs[0];
				if (F.Name[0] === '!')
					return F;
			}

			return NILField;
		}

		toABs ()
		{
		    this.notNIL;

			for (const F of this.Cs)
				F.toAB;

			for (const F of this.Ds)
				F.toAB;
		}

		update (N : string, V : any){
		    this.notNIL;

			let i;
			let Fs = ((N[0] < '0') || !N) ? this.Ds : this.Cs;
			for (i = Fs.length; --i >= 0;) {
					if (Fs[i].Name === N) {
						Fs[i] = new PackField (N,V);
						return true;
					}
				}

			return false;	// not found, no change
		}

		data(Name: string): PFData {
			let F = this.getField(Name);
			return F !== NILField ? F.Data : NILAB;
		}

		str(Name: string) {
			let F = this.getField(Name);
			return F !== NILField ? F.Str : '';
		}

		num(Name: string) {
			let F = this.getField(Name);
			return F !== NILField ? F.Num : NaN;
		}

		list (Name: string) {
			let F = this.getField(Name);
			return F !== NILField ? F.List : NILList;
		}

		pack (Name: string) {
			let F = this.getField(Name);
			return F !== NILField ? F.Pack : NILPack;
		}

		get desc() {
			let Lines = [];
			let Pref = this.getPrefix ();
			let Fields = this.Cs.concat (this.Ds);
			let nFields = Fields.length;

			let Str = this.summary;
			Lines.push(Str);
			Lines.push ('Prefix = ' + Pref);


			for (const F of this.Cs) {
				Lines.push ('  C::' + F.desc);
				}
			for (const F of this.Ds) {
					Lines.push ('  D::' + F.desc);
			}

			if (this === NILPack)
				return 'NILPack!'
	
			return Lines.join('\n');
		}

		get expand () {
			if (!this.multi)
				return this.desc + '\n';

			let Lines = [];
			Lines.push (this.desc + '\n\n ** Expanded views of each record **' + this.Ds.length.toString () + 'n');

			let count = 0;
			for (const D of this.Ds) {
				let BP = new BufPack ();
				BP.bufIn (D.AB);
				Lines.push ('----- Record ' + (++count).toString () + '\n' + BP.desc);
			}

			return Lines.join ('\n');
		}

		private getPrefix(): string {
			this.toABs ();

			let PFs = this.Cs.concat (this.Ds);

			let Prefix = '    ';
			if (this._type) {
				Prefix += ':' + this._type;
				if (this.Details)
					Prefix += '[' + this.Details + ']';
			}
			//	console.log ('Building Prefix, Type = ' + this.Type1 + ', starting as:' + Prefix);

			for (let PF of PFs) {
				//	console.log ('  Prefix add Name ' + PF.Name + ' Type ' + PF.Type + ' Size ' + PF.Size.toString ());
				Prefix += ',' + PF.Type + PF.Name + ':' + PF.AB.byteLength.toString();
			}
			return Prefix;
		}

		bufOut (): ArrayBuffer {
			let Prefix = this.getPrefix();
			let PAB = str2ab (Prefix);
			let Bytes = PAB.byteLength;
			let ByteStr = Bytes.toString ();
			console.log ('FirstPAB ' + PAB.byteLength.toString () + ' Strlen=' + Prefix.length);
			if (PAB.byteLength != Prefix.length)
				log ('*******mismatch!');
			Prefix = ByteStr + Prefix.slice (ByteStr.length);
			PAB = str2ab (Prefix);
			// console.log ('SecondPAB ' + PAB.byteLength.toString ());

			let Fields = this.Cs.concat (this.Ds);
			let limit = Fields.length;

			for (let F of Fields)
				Bytes += F.AB.byteLength;

			let AB = new ArrayBuffer (Bytes);

			// console.log ('AB = ' + AB + ' bytes = ' + AB.byteLength.toString ());

			let BA = new Uint8Array (AB);
			BA.set (PAB);
			let Pos = PAB.byteLength;

			for (let F of Fields) {
				BA.set (new Uint8Array (F.AB), Pos);
				// console.log ('  BufOut Name:' + F.Name + ' Size ' + F.Size.toString () + ' ' + F.Type);
				Pos += F.AB.byteLength;
			}

			if (Bytes < PAB.byteLength)
				throw 'BufOUT';

			return AB;
		}

		copy () : BufPack {
			let AB = this.bufOut ();
			let NewBP = new BufPack ();
			NewBP.bufIn (AB);
			return NewBP;
		}

		static ByteArray (nBytes : number) {
			let Bytes = new Uint8Array (nBytes);

			let i = 0;
			for (var B of Bytes)
				B = i++  &  255;

			return Bytes;
		}

		bufIn (AB: ArrayBuffer) {
		    this.notNIL;

			this.clear ();

			let BA = new Uint8Array (AB);

			let NumBuf = AB.slice (0, 8);
			let PStr = ab2str (NumBuf).slice (0,4);
			let PBytes = Number (PStr);
			let Num;

			let PBuf = BA.slice (0,PBytes);
			let Prefix = ab2str (PBuf);

			let NPos = 4;
			let Type = '';
			let Details = '';

			//	console.log ('BufIn, Prefix =' + Prefix + '.');
			if (Prefix[4] === ':') {
				Type = Prefix.slice(5);
				let C0 = Type.indexOf(',');
				if (C0 < 0) {
					console.log ('No fields present, we are done.\n');	
					return; // no fields present, done
				}

				let B0 = Type.indexOf('[');
				if (B0 >= 0 && B0 < C0) {
					// found details
					let B1 = Type.indexOf(']');
					if (B1 < 0) {
						console.log ('Tragic error, no terminating ]\n');
						return; // tragic error
					}
					Details = Type.slice(B0 + 1, B1);
					Type = Type.slice(0, B0).trimEnd();
					NPos = B1 + 4;
				}
				Type = Type.slice (0,C0);
			}
			this._type = Type;
			// console.log ('1.Type1 set to ' + Type)
			this._details = Details;

			let Offset = PBytes;

			let TPos;
			let SPos;
			let EndPos;
			let Name;
			let DBuf;
			let nBytes;

			while ((NPos = Prefix.indexOf(',', NPos)) > 0) {
				if ((SPos = Prefix.indexOf(':', ++NPos)) > 0) {
//					let NewFld = new PackField(Prefix.slice (Name,DBuf,Type);

					Type = Prefix[NPos];
					Name = Prefix.slice(NPos + 1, SPos);

					let NumStr = Prefix.slice(++SPos, SPos + 12);
					if ((EndPos = NumStr.indexOf(',')) >= 0)
						NumStr = NumStr.slice(0, EndPos);

					nBytes = Number(NumStr);

					// console.log (Type + Name +':Offset = ' + Offset.toString () + 
					// ' NumStr =' + NumStr + '. nBytes =' + nBytes.toString () );


					DBuf = AB.slice(Offset, Offset + nBytes);

					if (DBuf.byteLength !== nBytes) {
						console.log ('  !! DBuf bytes = ' + DBuf.byteLength.toString ());
						throw "LimitError!";
					}

					if (Name === 'ist')
						throw ('ist!3');

					let NewFld = new PackField (Name,DBuf,Type);

					if ((NewFld.Name[0] >= '0') || !NewFld.Name) {
						this.Ds.push (NewFld);
					}
					else {
						this.Cs.push (NewFld);
					}

					//console.log('  BufIn C/D = ' + this.Cs.length.toString () + '/' +
					//	this.Ds.length.toString () + ' ' + NewFld.Desc());

					Offset += nBytes;	//	NewFld.Size, should be same!
					NPos = SPos;
				}
			}
		}

		clear() {
			this.Cs = [];
			this.Ds = [];
			this._type = '';
			this._details = '';
		}

		get multi () {
			if (this._type  &&  (this._type[0] === '*'))
				return this.Ds.length;
			else return 0;
		}

/*		Unpack creates an array of BufPacks corresponding to the BufPacks
		that are packed in this single BufPack. Also strips out the */

		unpackArray () : BufPack[] {
			if (!this.multi)
				return [];

			let BPs = new Array<BufPack> (this.Ds.length);
			//let BPs = Array<BufPack> ();
			let count = 0;

			for (const F of this.Ds) {
					let NewBP = new BufPack ();
					NewBP.bufIn (F.AB);
					BPs[count++] = NewBP;
			}

			this._type = this._type.slice (1);	// result is NOT a multipack...
			this.Ds.length = 0;

			return BPs;
		}

		/* Pack allows multiple BufPacks to be packed into a single BufPack,
		often to send to another client or server.  The array of BufPacks to
		pack is passed in	*/

		packArray (BPs : BufPack[]) {
			let NewFields = new Array<PackField> (BPs.length);
			let count = 0;

			let limit = BPs.length;
			for (let i = 0; i < limit; ++i) {
				NewFields[count++] = new PackField ('',BPs[i]);
			}
			this.Ds = NewFields;

			if (this._type[0] !== '*')
				this._type = '*' + this._type;

			//	console.log ('2.Type1 set to ' + this.Type1);
		}

		objectIn (O : Object) {
		    this.notNIL;

			this.clear ();
			
			// console.log ('ObjectIn:Adding entries!');

			let entries = Object.entries (O);
			let AddArray = Array(entries.length << 1);
			let count = 0;

			for (let entry of entries) {
				AddArray[count++] = entry[0];
				AddArray[count++] = entry[1];

				// console.log ('   AddArray[' + count.toString () + '] entry = ' + entry);
			}

			this.add (AddArray);
			// console.log ('ObjectIn Resultant BP:' + '\n' + this.Desc ());
		}

		objectOut () : Object {
			let o = new Object ();
			let Fields = this.Cs.concat (this.Ds);

			for (let F of Fields) {
				let N = F.Name;
				switch (F.Type) {
					case tNum : Object.assign (o,{ N : F.Num }); break;
					case tStr : Object.assign (o,{ N : F.Str }); break;
					case tPack : case tData : Object.assign (o, {N : F.Pack.copy () }); break;
					case tList : Object.assign (o, {N : new vList (F.List.getStr)}); break;
						
					default : Object.assign (o,{ N : F.AB.slice(0) }); break;
				}
			}

			console.log ('New Object = ' + o);
			return o; 
		}
	}

	export const NILPack = new BufPack ();

	export class SQL {
		bSelDel (Tile : string, ID : number, Query : string) : BufPack {
			let Pack = new BufPack ();
			Pack.xAdd ('Q', Query);
			Pack.add (['.T', Tile, '.I', ID]);

			return Pack;
		}

		bInsUpd (Pack : BufPack) : BufPack {
			let ID = Pack.num ('.I');

			Pack.xAdd ('Q',ID ? 'U' : 'I');
			return Pack;
		}

	}	// RS1

	export const sql = new SQL ();

	(() => {
		// Immediately Invoked Function Expression IIFE
		// Code that runs in your function

		let Q = ['List', vList, '', RSData];
		// let RSDT = new RSDataType ('List',vList);
		// let QDT = new RSDataType ('ABC',PackToData);

		RegPackToData (PackToData);
		_Classes.push (vList);
		// let List = new _Classes[0];

		console.log ('NILData TEST!');
	})()	

	/*	Defines for vLists	*/

	// FM:FM="FM|Num|Int|Dollar|Ord|Range|Pair|Nums|Member|Set|Str|Strs|Upper|"
	export const FMDollar = 3,
		FMInt = 2,
		FMMember = 8,
		FMNum = 1,
		FMNums = 7,
		FMOrd = 4,
		FMPair = 6,
		FMRange = 5,
		FMSet = 9,
		FMStr = 10,
		FMStrs = 11,
		FMUpper = 12;
	// Ct:Country="Ct:Country|US:United States|UK:United Kingdom|Ca:Canada|Ru:Russia|In:India|"
	export const CtCa = 3,
		CtIn = 5,
		CtRu = 4,
		CtUK = 2,
		CtUS = 1;
	// Ct:ConnectType="Ct:ConnectType|Data|Event|Action|Queue|DB|SQL:SQLite|Remote|Retail|"
	export const CtAction = 3,
		CtDB = 5,
		CtData = 1,
		CtEvent = 2,
		CtQueue = 4,
		CtRemote = 7,
		CtRetail = 8,
		CtSQL = 6;
	// Lt:ListType="Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|"
	export const LtAc = 3,
		LtDt = 1,
		LtEv = 2,
		LtLg = 9,
		LtMt = 8,
		LtPr = 7,
		LtRt = 4,
		LtTd = 5,
		LtTs = 6;
	// Dt:DataType="Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|"
	export const DtString = 1,
		DtInteger = 2,
		DtNumber = 3;
	// Ev:Event="Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|"
	export const EvClick = 1,
		EvDblClick = 4,
		EvDrag = 7,
		EvDrop = 6,
		EvEnter = 2,
		EvExit = 3,
		EvSwipe = 5;
	// Rt:Return="Rt:Return|Ok|Fail|Equal|Unequal|Queue|"
	export const RtEqual = 3,
		RtFail = 2,
		RtOk = 1,
		RtQueue = 5,
		RtUnequal = 4;
	// Td:TileDef="Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|"
	export const TdBtn = 4,
		TdImg = 5,
		TdLnEdit = 2,
		TdTile = 1,
		TdTxtEdit = 3,
		TdVideo = 6;
	// Ts:TileSize="Ts:TileSize|Fixed|T:Top|TL:Top Left|TR:Top Right|B:Bottom|BL:Bottom Left|BR:Bottom Right|L:Left|R:Right|SH:Shared|"
	export const TsB = 5,
		TsBL = 6,
		TsBR = 7,
		TsFixed = 1,
		TsL = 8,
		TsR = 9,
		TsSH = 10,
		TsT = 2,
		TsTL = 3,
		TsTR = 4;
	// Pr:Process="Pr:Process|Init|Read|Set|Clear|Default||"
	export const Pr = 6,
		PrClear = 4,
		PrDefault = 5,
		PrInit = 1,
		PrRead = 2,
		PrSet = 3;
	// Mt:MessageType="Mt:MessageType|Input|Output|Event|Trigger|Action|"
	export const MtAction = 5,
		MtEvent = 3,
		MtInput = 1,
		MtOutput = 2,
		MtTrigger = 4;
	// Ac:Action="Ac:Action|Init|Timer|Login|Logout|"
	export const AcInit = 1,
		AcLogin = 3,
		AcLogout = 4,
		AcTimer = 2;
	// Lg:Language="Lg:Language|En:English|Es:Espanol|Cn:Chinese|"
	export const LgCn = 3,
		LgEn = 1,
		LgEs = 2;
	// Test:Test="Test|NameF:~%12~First Name|XY:~P~XY Dim|Cost:~$~Dollar Price|"
	export const TestCost = 3,
		TestNameF = 1,
		TestXY = 2;

	export const TypeArray = [
		FMNum,
		FMInt,
		FMDollar,
		FMPair,
		FMOrd,
		FMNums,
		FMStr,
		FMUpper,
		FMMember,
		FMRange,
		FMSet
	];

	export const TypeNames = ['Number','Integer','Dollar','Pair',
						'Ordinal','Numbers','String',
						'UpperCase','Member','Range','Set'];
	export const TypeChars = '#I$POA%U@R{';
} // namespace RS1

/*  Documentation Names/Desc	___________________



List FM(FM)	FM|Num|Int|Dollar|Ord|Range|Pair|Nums|Member|Set|Str|Strs|Upper|
Dollar	Dollar	ID[Dollar]==3
Int	Int	ID[Int]==2
Member	Member	ID[Member]==8
Num	Num	ID[Num]==1
Nums	Nums	ID[Nums]==7
Ord	Ord	ID[Ord]==4
Pair	Pair	ID[Pair]==6
Range	Range	ID[Range]==5
Set	Set	ID[Set]==9
Str	Str	ID[Str]==10
Strs	Strs	ID[Strs]==11
Upper	Upper	ID[Upper]==12
NameList=|Num:1|Int:2|Dollar:3|Ord:4|Range:5|Pair:6|Nums:7|Member:8|Set:9|Str:10|Strs:11|Upper:12|	12


List Ft(Ft)	Ft|#:Num|I:Int|$:Dollar|P:Pair|O:Ord|A:Nums|%:Str|U:Upper|@:Member|R:Range|{:Set|
$	Dollar	ID[$]==3
I	Int	ID[I]==2
@	Member	ID[@]==9
#	Num	ID[#]==1
A	Nums	ID[A]==6
O	Ord	ID[O]==5
P	Pair	ID[P]==4
R	Range	ID[R]==10
{	Set	ID[{]==11
%	Str	ID[%]==7
U	Upper	ID[U]==8
NameList=|#:1|I:2|$:3|P:4|O:5|A:6|%:7|U:8|@:9|R:10|{:11|	11


List Ct(ConnectType)	Ct:ConnectType|Data|Event|Action|Queue|DB|SQL:SQLite|Remote|Retail|
Action	Action	ID[Action]==3
DB	DB	ID[DB]==5
Data	Data	ID[Data]==1
Event	Event	ID[Event]==2
Queue	Queue	ID[Queue]==4
Remote	Remote	ID[Remote]==7
Retail	Retail	ID[Retail]==8
SQL	SQLite	ID[SQL]==6
NameList=|Data:1|Event:2|Action:3|Queue:4|DB:5|SQL:6|Remote:7|Retail:8|	8


List Lt(ListType)	Lt:ListType|Dt:DataType|Ev:Event|Ac:Action|Rt:Return|Td:TileDef|Ts:TileSize|Pr:Process|Mt:MessageType|Lg:Language|
Ac	Action	ID[Ac]==3
Dt	DataType	ID[Dt]==1
Ev	Event	ID[Ev]==2
Lg	Language	ID[Lg]==9
Mt	MessageType	ID[Mt]==8
Pr	Process	ID[Pr]==7
Rt	Return	ID[Rt]==4
Td	TileDef	ID[Td]==5
Ts	TileSize	ID[Ts]==6
NameList=|Dt:1|Ev:2|Ac:3|Rt:4|Td:5|Ts:6|Pr:7|Mt:8|Lg:9|	9


List Dt(DataType)	Dt:DataType|String:Free format string|Integer:Whole Number|Number:Whole or Real Number|
String	Free format string	ID[String]==1
Integer	Whole Number	ID[Integer]==2
Number	Whole or Real Number	ID[Number]==3
NameList=|String:1|Integer:2|Number:3|	3


List Ev(Event)	Ev:Event|Click|Enter|Exit|DblClick|Swipe|Drop|Drag|
Click	Click	ID[Click]==1
DblClick	DblClick	ID[DblClick]==4
Drag	Drag	ID[Drag]==7
Drop	Drop	ID[Drop]==6
Enter	Enter	ID[Enter]==2
Exit	Exit	ID[Exit]==3
Swipe	Swipe	ID[Swipe]==5
NameList=|Click:1|Enter:2|Exit:3|DblClick:4|Swipe:5|Drop:6|Drag:7|	7


List Rt(Return)	Rt:Return|Ok|Fail|Equal|Unequal|Queue|
Equal	Equal	ID[Equal]==3
Fail	Fail	ID[Fail]==2
Ok	Ok	ID[Ok]==1
Queue	Queue	ID[Queue]==5
Unequal	Unequal	ID[Unequal]==4
NameList=|Ok:1|Fail:2|Equal:3|Unequal:4|Queue:5|	5


List Td(TileDef)	Td:TileDef|Tile|LnEdit|TxtEdit|Btn|Img|Video|
Btn	Btn	ID[Btn]==4
Img	Img	ID[Img]==5
LnEdit	LnEdit	ID[LnEdit]==2
Tile	Tile	ID[Tile]==1
TxtEdit	TxtEdit	ID[TxtEdit]==3
Video	Video	ID[Video]==6
NameList=|Tile:1|LnEdit:2|TxtEdit:3|Btn:4|Img:5|Video:6|	6


List Ts(TileSize)	Ts:TileSize|Fixed|T:Top|TL:Top Left|TR:Top Right|B:Bottom|BL:Bottom Left|BR:Bottom Right|L:Left|R:Right|SH:Shared|
B	Bottom	ID[B]==5
BL	Bottom Left	ID[BL]==6
BR	Bottom Right	ID[BR]==7
Fixed	Fixed	ID[Fixed]==1
L	Left	ID[L]==8
R	Right	ID[R]==9
SH	Shared	ID[SH]==10
T	Top	ID[T]==2
TL	Top Left	ID[TL]==3
TR	Top Right	ID[TR]==4
NameList=|Fixed:1|T:2|TL:3|TR:4|B:5|BL:6|BR:7|L:8|R:9|SH:10|	10


List Pr(Process)	Pr:Process|Init|Read|Set|Clear|Default|
Clear	Clear	ID[Clear]==4
Default	Default	ID[Default]==5
Init	Init	ID[Init]==1
Read	Read	ID[Read]==2
Set	Set	ID[Set]==3
NameList=|Init:1|Read:2|Set:3|Clear:4|Default:5|	5


List Mt(MessageType)	Mt:MessageType|Input|Output|Event|Trigger|Action|
Action	Action	ID[Action]==5
Event	Event	ID[Event]==3
Input	Input	ID[Input]==1
Output	Output	ID[Output]==2
Trigger	Trigger	ID[Trigger]==4
NameList=|Input:1|Output:2|Event:3|Trigger:4|Action:5|	5


List Ac(Action)	Ac:Action|Init|Timer|Login|Logout|
Init	Init	ID[Init]==1
Login	Login	ID[Login]==3
Logout	Logout	ID[Logout]==4
Timer	Timer	ID[Timer]==2
NameList=|Init:1|Timer:2|Login:3|Logout:4|	4


List Lg(Language)	Lg:Language|En:English|Es:Espanol|Cn:Chinese|
Cn	Chinese	ID[Cn]==3
En	English	ID[En]==1
Es	Espanol	ID[Es]==2
NameList=|En:1|Es:2|Cn:3|	3


List Cy(Country)	Cy:Country|US:United States|UK:United Kingdom|CA:Canada|RU:Russia|IN:India|
CA	Canada	ID[CA]==3
IN	India	ID[IN]==5
RU	Russia	ID[RU]==4
UK	United Kingdom	ID[UK]==2
US	United States	ID[US]==1
NameList=|US:1|UK:2|CA:3|RU:4|IN:5|	5


List Test(Test)	Test|NameF:~%12~First Name|XY:~P~XY Dim|Cost:~$~Dollar Price|
Cost	~$~Dollar Price	ID[Cost]==3
NameF	~%12~First Name	ID[NameF]==1
XY	~P~XY Dim	ID[XY]==2
NameList=|NameF:1|XY:2|Cost:3|	3

 Dump of LongList...
T	a|name:Full|	s|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|	
 T	a|name:Top|	

 End of LongList Dump.  
LongList Name=T	a|name Desc=Full|	s|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|	


T		1.level=0 parent=0 prev=0 next=11 first=2 last=10 #=10 TileID=T
		 List.Name=a=a|name:Full|
		 List.Name=s=s|display:flex|flex-direction:column|align:center|justify:center|background:black|min-width:750px|max-width:750px|min-height:500px|
 T		2.level=1 parent=1 prev=0 next=7 first=3 last=6 #=5 TileID=T
		 List.Name=a=a|name:Top|
		 List.Name=s=s|background:magenta|min-height:150px|
  T		3.level=2 parent=2 prev=0 next=6 first=4 last=5 #=3 TileID=T
		 List.Name=a=a|name:Left|
		 List.Name=s=s|background:green|min-width:100px|
   T		4.level=3 parent=3 prev=0 next=5 first=0 last=4 #=1 TileID=T
		 List.Name=a=a|name:Top|
		 List.Name=s=s|background:magenta|min-height:50px|
   T		5.level=3 parent=3 prev=4 next=0 first=0 last=5 #=1 TileID=T
		 List.Name=a=a|name:Bottom|
		 List.Name=s=s|background:magenta|min-height:100px|
  T		6.level=2 parent=2 prev=3 next=0 first=0 last=6 #=1 TileID=T
		 List.Name=a=a|name:Right|
		 List.Name=s=s|background:cyan|width:100%|display:flex|
 T		7.level=1 parent=1 prev=2 next=0 first=8 last=10 #=4 TileID=T
		 List.Name=a=a|name:Bottom|
		 List.Name=s=s|display:flex|flex-direction:row|background:white|min-height:350px|
  T		8.level=2 parent=7 prev=0 next=9 first=0 last=8 #=1 TileID=T
		 List.Name=a=a|name:Left|
		 List.Name=s=s|background:green|min-width:100px|
  T		9.level=2 parent=7 prev=8 next=10 first=0 last=9 #=1 TileID=T
		 List.Name=a=a|name:Middle|
		 List.Name=s=s|background:cyan|width:100%|display:flex|
  T		10.level=2 parent=7 prev=9 next=0 first=0 last=10 #=1 TileID=T
		 List.Name=a=a|name:Right|
		 List.Name=s=s|background:yellow|min-width:200px|
@NOLIST@	11.level=0 parent=0 prev=1 next=0 first=0 last=11 #=1 TileID=NONE

*/
